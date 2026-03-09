  const handleSubmit = async () => {
    if (!selectedAction) {
      toast({
        title: "Select an action",
        description: "Please select how you want to handle this payment adjustment",
        variant: "destructive",
      });
      return;
    }

    // If "none" is selected, just save the order without any payment processing
    if (selectedAction === 'none') {
      // Calculate new payment status based on current amounts
      const newPaymentStatus = calculatePaymentStatusAfterAdjustment(
        originalAmount,
        newAmount,
        originalAmount, // paid amount is original amount (what was already paid)
        creditMemoBalance,
        'none'
      );

      // Update order payment status
      try {
        await supabase
          .from('orders')
          .update({ payment_status: newPaymentStatus })
          .eq('id', orderId);
      } catch (error) {
        console.error('Error updating payment status:', error);
      }

      toast({
        title: "Order Saved",
        description: "Order items updated. Payment adjustment pending.",
      });

      onPaymentComplete({
        success: true,
        adjustmentType: 'none',
      });

      onOpenChange(false);
      return;
    }

    setLoading(true);

    try {
      let result: { success: boolean; data?: any; error?: string };
      let transactionId: string | undefined;
      let newPaymentStatus: string;

      if (isIncrease) {
        if (selectedAction === 'collect_payment') {
          const card = savedCards.find((c: any) => c.id === selectedCard);
          
          if (!card) {
            throw new Error('Please select a payment method');
          }

          const paymentResult = await PaymentAdjustmentService.processGatewayPayment(
            absoluteDifference,
            'saved_card',
            {
              customerProfileId: card.customer_profile_id,
              paymentProfileId: card.payment_profile_id,
            },
            orderId,
            orderNumber
          );

          if (!paymentResult.success) {
            throw new Error(paymentResult.error || 'Payment failed');
          }

          transactionId = paymentResult.transactionId;

          // Record payment transaction
          await PaymentAdjustmentService.recordPaymentTransaction({
            profileId: customerId,
            orderId,
            transactionId,
            transactionType: 'additional_payment',
            amount: absoluteDifference,
            paymentMethodType: 'saved_card',
            status: 'completed',
            cardLastFour: card.card_last_four,
            cardType: card.card_type,
          });

          // Record account transaction
          await PaymentAdjustmentService.recordAccountTransaction({
            customerId,
            orderId,
            transactionType: 'credit',
            referenceType: 'payment',
            description: `Additional payment for order ${orderNumber}`,
            amount: absoluteDifference,
            processedBy: customerId,
            transactionId,
          });

          result = await PaymentAdjustmentService.processAdditionalPayment(
            orderId,
            customerId,
            originalAmount,
            newAmount,
            'saved_card',
            transactionId || `TXN_${Date.now()}`,
            customerId,
            reason || `Order ${orderNumber} modified - additional payment`
          );

          // Calculate new payment status - payment collected, should be paid
          newPaymentStatus = calculatePaymentStatusAfterAdjustment(
            originalAmount,
            newAmount,
            originalAmount, // original paid amount
            creditMemoBalance,
            'collect_payment'
          );

          // Update order payment status
          await supabase
            .from('orders')
            .update({ 
              payment_status: newPaymentStatus,
              paid_amount: originalAmount + absoluteDifference 
            })
            .eq('id', orderId);
        } else if (selectedAction === 'send_payment_link') {
          // Send payment link via email
          setSendingEmail(true);
          
          // Prepare order data for payment link email
          const paymentLinkData = {
            id: orderId,
            order_number: orderNumber,
            customerInfo: {
              name: customerName,
              email: customerEmail || orderData?.customerInfo?.email,
              phone: orderData?.customerInfo?.phone || '',
            },
            items: orderData?.items || [],
            total: newAmount,
            total_amount: newAmount,
            tax_amount: orderData?.tax_amount || 0,
            shipping_cost: orderData?.shipping_cost || 0,
            date: new Date().toISOString(),
            status: 'pending_additional_payment',
            adjustment_amount: absoluteDifference,
            original_amount: originalAmount,
            paid_amount: originalAmount, // Amount already paid
            adjustment_reason: reason || `Order ${orderNumber} modified - additional payment required`,
          };

          try {
            await axios.post("/paynow-user", paymentLinkData);
            
            // Create adjustment record with pending status
            result = await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'additional_payment',
              originalAmount,
              newAmount,
              differenceAmount: absoluteDifference,
              paymentMethod: 'payment_link',
              paymentStatus: 'pending',
              reason: reason || `Order ${orderNumber} modified - payment link sent`,
            });

            // Calculate new payment status - payment link sent, should be partial_paid
            newPaymentStatus = calculatePaymentStatusAfterAdjustment(
              originalAmount,
              newAmount,
              originalAmount,
              creditMemoBalance,
              'send_payment_link'
            );

            // Update order payment status
            await supabase
              .from('orders')
              .update({ payment_status: newPaymentStatus })
              .eq('id', orderId);

            toast({
              title: "Payment Link Sent",
              description: `Payment link for $${absoluteDifference.toFixed(2)} sent to ${customerEmail || orderData?.customerInfo?.email}`,
            });
          } catch (emailError: any) {
            throw new Error(emailError.message || 'Failed to send payment link');
          } finally {
            setSendingEmail(false);
          }
        } else if (selectedAction === 'use_credit' && hasCredit) {
          // Check if sufficient credit is available
          if (availableCredit < absoluteDifference) {
            throw new Error(`Insufficient credit. Available: $${availableCredit.toFixed(2)}, Required: $${absoluteDifference.toFixed(2)}`);
          }

          const { data: rpcResult, error: rpcError } = await supabase.rpc(
            "apply_credit_line_order_adjustment",
            {
              p_order_id: orderId,
              p_customer_id: customerId,
              p_adjustment_amount: absoluteDifference,
              p_original_amount: originalAmount,
              p_new_amount: newAmount,
              p_reason: reason || `Order ${orderNumber} modified - charged to credit line`,
            }
          );

          if (rpcError) {
            throw rpcError;
          }

          if (!rpcResult?.success) {
            throw new Error(rpcResult?.message || 'Failed to apply credit line adjustment');
          }

          result = { success: true, data: rpcResult };

          // Calculate new payment status - credit line used, should be paid
          newPaymentStatus = calculatePaymentStatusAfterAdjustment(
            originalAmount,
            newAmount,
            originalAmount,
            creditMemoBalance,
            'use_credit'
          );

          // Update order payment status
          await supabase
            .from('orders')
            .update({ payment_status: newPaymentStatus })
            .eq('id', orderId);

          toast({
            title: "Credit Applied",
            description: `$${absoluteDifference.toFixed(2)} charged to credit line. Credit Invoice: ${rpcResult.credit_invoice_number || 'Created'}`,
          });
        } else {
          throw new Error('Invalid action selected');
        }
      } else {
        if (selectedAction === 'issue_credit_memo') {
          result = await PaymentAdjustmentService.issueCreditMemo({
            customerId,
            amount: absoluteDifference,
            reason: reason || `Order ${orderNumber} modified - credit memo issued`,
            orderId,
          });

          if (result.success) {
            await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'credit_memo_issued',
              originalAmount,
              newAmount,
              differenceAmount: -absoluteDifference,
              paymentStatus: 'completed',
              creditMemoId: result.data?.credit_memo_id,
              reason: reason || `Order ${orderNumber} modified - credit memo issued`,
            });

            // Calculate new payment status - credit memo issued
            newPaymentStatus = calculatePaymentStatusAfterAdjustment(
              originalAmount,
              newAmount,
              originalAmount,
              creditMemoBalance + absoluteDifference,
              'issue_credit_memo'
            );

            // Update order payment status
            await supabase
              .from('orders')
              .update({ payment_status: newPaymentStatus })
              .eq('id', orderId);
          }
        } else if (selectedAction === 'process_refund') {
          result = await PaymentAdjustmentService.createRefund({
            orderId,
            customerId,
            amount: absoluteDifference,
            reason: reason || `Order ${orderNumber} modified - refund processed`,
            refundMethod: 'original_payment',
            originalPaymentId: originalTransactionId || undefined,
          });

          if (result.success) {
            transactionId = result.data?.gateway_refund_id;
            
            // Record refund transaction
            await PaymentAdjustmentService.recordPaymentTransaction({
              profileId: customerId,
              orderId,
              transactionId,
              transactionType: 'refund',
              amount: absoluteDifference,
              paymentMethodType: 'card_refund',
              status: result.data?.status === 'completed' ? 'completed' : 'pending',
            });

            // Record account transaction for refund
            await PaymentAdjustmentService.recordAccountTransaction({
              customerId,
              orderId,
              transactionType: 'debit',
              referenceType: 'refund',
              description: `Refund for order ${orderNumber}`,
              amount: absoluteDifference,
              processedBy: customerId,
              transactionId,
            });
            
            await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'partial_refund',
              originalAmount,
              newAmount,
              differenceAmount: -absoluteDifference,
              paymentStatus: 'completed',
              refundId: result.data?.id,
              paymentTransactionId: transactionId,
              reason: reason || `Order ${orderNumber} modified - refund processed`,
            });

            // Calculate new payment status - refund processed
            newPaymentStatus = calculatePaymentStatusAfterAdjustment(
              originalAmount,
              newAmount,
              originalAmount - absoluteDifference,
              creditMemoBalance,
              'process_refund'
            );

            // Update order payment status
            await supabase
              .from('orders')
              .update({ payment_status: newPaymentStatus })
              .eq('id', orderId);
          }
        } else {
          throw new Error('Invalid action selected');
        }
      }

      if (result.success) {
        toast({
          title: "Payment adjustment completed",
          description: isIncrease 
            ? `Additional payment of $${absoluteDifference.toFixed(2)} processed`
            : `Credit/refund of $${absoluteDifference.toFixed(2)} processed`,
        });

        onPaymentComplete({
          success: true,
          adjustmentType: selectedAction,
          transactionId: transactionId || result.data?.id,
        });

        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to process adjustment');
      }
    } catch (error: any) {
      console.error('Payment adjustment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process payment adjustment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
