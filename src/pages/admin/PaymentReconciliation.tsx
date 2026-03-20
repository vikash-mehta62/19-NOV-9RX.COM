import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeftRight, Building2, Download, FileUp, RefreshCw, Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { SUPABASE_PUBLISHABLE_KEY, supabase } from "@/integrations/supabase/client";

type PaymentTransaction = {
  id: string;
  gateway_batch_id: string | null;
  gateway_settlement_time: string | null;
  amount: number;
  status: string;
};

type ReconciliationBatch = {
  id: string;
  gateway_batch_id: string;
  payment_settings_profile_id: string | null;
  settlement_date: string | null;
  gateway_amount: number;
  local_amount: number;
  transaction_count: number;
  gateway_transaction_count: number;
  local_transaction_count: number;
  missing_local_count: number;
  missing_gateway_count: number;
  mismatch_category: string | null;
  gateway_status: string | null;
  processor_statement_entry_id: string | null;
  processor_fee_amount: number;
  expected_net_amount: number;
  bank_deposit_id: string | null;
  bank_account_name: string | null;
  bank_deposit_date: string | null;
  bank_deposit_amount: number | null;
  difference_amount: number;
  reconciliation_status: string;
  notes: string | null;
  last_synced_at: string | null;
};

type BankDeposit = {
  id: string;
  deposit_date: string;
  bank_account_name: string;
  deposit_amount: number;
  reference_number: string | null;
  status: string;
  matched_batch_id: string | null;
  matched_batch_uuid: string | null;
  mismatch_category: string | null;
  notes: string | null;
};

type ProcessorStatementEntry = {
  id: string;
  statement_date: string;
  bank_account_name: string | null;
  batch_reference: string | null;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  matched_batch_id: string | null;
  matched_batch_uuid: string | null;
  mismatch_category: string | null;
  notes: string | null;
};

type BatchAggregate = {
  gateway_batch_id: string;
  settlement_date: string | null;
  gateway_amount: number;
  local_amount: number;
  transaction_count: number;
  expected_net_amount: number;
  last_synced_at: string;
};

const money = (value: number) => Number(value.toFixed(2));

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }
  return normalized;
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentValue.trim());
      if (currentRow.some((value) => value !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((value) => value !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = row[index] || "";
      return acc;
    }, {}),
  );
}

function validateStatementMath(grossAmount: number, feeAmount: number, netAmount: number) {
  return Math.abs(money(grossAmount - feeAmount) - money(netAmount)) < 0.01;
}

export default function PaymentReconciliation() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncingGateway, setSyncingGateway] = useState(false);
  const [syncingBatches, setSyncingBatches] = useState(false);
  const [bulkMatching, setBulkMatching] = useState(false);
  const [importingStatements, setImportingStatements] = useState(false);
  const [savingResolution, setSavingResolution] = useState(false);
  const [batches, setBatches] = useState<ReconciliationBatch[]>([]);
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [statementEntries, setStatementEntries] = useState<ProcessorStatementEntry[]>([]);
  const [bankFilter, setBankFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [selectedBatch, setSelectedBatch] = useState<ReconciliationBatch | null>(null);
  const [resolutionState, setResolutionState] = useState({
    statementEntryId: "none",
    depositId: "none",
    notes: "",
    amountTolerance: "0.01",
    dateWindowDays: "7",
    ignoreBankName: false,
    manuallyResolved: false,
  });
  const [newDeposit, setNewDeposit] = useState({
    depositDate: new Date().toISOString().slice(0, 10),
    bankAccountName: "",
    depositAmount: "",
    referenceNumber: "",
    notes: "",
  });
  const [newStatement, setNewStatement] = useState({
    statementDate: new Date().toISOString().slice(0, 10),
    bankAccountName: "",
    batchReference: "",
    grossAmount: "",
    feeAmount: "",
    netAmount: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);

    const [
      { data: batchRows, error: batchError },
      { data: depositRows, error: depositError },
      { data: statementRows, error: statementError },
    ] = await Promise.all([
      supabase.from("payment_reconciliation_batches").select("*").order("settlement_date", { ascending: false }),
      supabase.from("bank_deposits").select("*").order("deposit_date", { ascending: false }),
      supabase.from("processor_statement_entries").select("*").order("statement_date", { ascending: false }),
    ]);

    if (batchError || depositError || statementError) {
      toast({
        title: "Failed to load reconciliation data",
        description: batchError?.message || depositError?.message || statementError?.message || "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setBatches((batchRows || []) as ReconciliationBatch[]);
    setDeposits((depositRows || []) as BankDeposit[]);
    setStatementEntries((statementRows || []) as ProcessorStatementEntry[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getValidatedAccessToken = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (session?.access_token) {
      const { error: userError } = await supabase.auth.getUser(session.access_token);
      if (!userError) {
        return session.access_token;
      }
    }

    if (!session?.refresh_token) {
      return null;
    }

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (refreshError) {
      throw refreshError;
    }

    return refreshed.session?.access_token || null;
  };

  const syncGatewayStatuses = async () => {
    setSyncingGateway(true);
    let accessToken: string | null = null;

    try {
      accessToken = await getValidatedAccessToken();
    } catch (error) {
      toast({
        title: "Authentication required",
        description: error instanceof Error ? error.message : "Please log in again and retry gateway sync.",
        variant: "destructive",
      });
      setSyncingGateway(false);
      return;
    }

    if (!accessToken) {
      toast({
        title: "Authentication required",
        description: "No active admin session was found. Please log in again and retry gateway sync.",
        variant: "destructive",
      });
      setSyncingGateway(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("reconcile-authorize-transactions-v2", {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "x-user-jwt": accessToken,
      },
      body: {
        mode: "sync_batches",
        daysBack: 7,
        maxBatches: 20,
        accessToken,
      },
    });

    if (error || !data?.success) {
      toast({
        title: "Gateway sync failed",
        description: error?.message || data?.error || "Could not refresh Authorize.Net statuses.",
        variant: "destructive",
      });
      setSyncingGateway(false);
      return;
    }

    await loadData();
    setSyncingGateway(false);
    toast({
      title: "Gateway sync complete",
      description: `Synced ${data.summary?.batchesUpserted || 0} Authorize.Net batches.`,
    });
  };

  const buildBatchAggregates = (transactions: PaymentTransaction[], existingBatches: ReconciliationBatch[]): BatchAggregate[] => {
    const grouped = new Map<string, BatchAggregate>();
    const existingBatchMap = new Map(existingBatches.map((batch) => [batch.gateway_batch_id, batch]));

    transactions.forEach((tx) => {
      if (!tx.gateway_batch_id || tx.status !== "approved") return;

      const settlementDate = tx.gateway_settlement_time ? tx.gateway_settlement_time.slice(0, 10) : null;
      const existing = grouped.get(tx.gateway_batch_id);

      if (existing) {
        existing.gateway_amount = money(existing.gateway_amount + Number(tx.amount || 0));
        existing.local_amount = money(existing.local_amount + Number(tx.amount || 0));
        existing.expected_net_amount = existing.local_amount;
        existing.transaction_count += 1;
        if (!existing.settlement_date && settlementDate) existing.settlement_date = settlementDate;
        return;
      }

      const existingBatch = existingBatchMap.get(tx.gateway_batch_id);
      grouped.set(tx.gateway_batch_id, {
        gateway_batch_id: tx.gateway_batch_id,
        settlement_date: existingBatch?.settlement_date || settlementDate,
        gateway_amount: money(Number(existingBatch?.gateway_amount || tx.amount || 0)),
        local_amount: money(Number(tx.amount || 0)),
        transaction_count: 1,
        expected_net_amount: money(Number(existingBatch?.expected_net_amount || tx.amount || 0)),
        last_synced_at: new Date().toISOString(),
      });
    });

    return Array.from(grouped.values());
  };

  const syncBatchesFromTransactions = async () => {
    setSyncingBatches(true);
    const [
      { data: txRows, error },
      { data: existingBatchRows, error: existingBatchError },
    ] = await Promise.all([
      supabase
        .from("payment_transactions")
        .select("id, gateway_batch_id, gateway_settlement_time, amount, status")
        .not("gateway_batch_id", "is", null)
        .order("gateway_settlement_time", { ascending: false }),
      supabase
        .from("payment_reconciliation_batches")
        .select("*")
        .order("settlement_date", { ascending: false }),
    ]);

    if (error || existingBatchError) {
      toast({ title: "Batch sync failed", description: error?.message || existingBatchError?.message, variant: "destructive" });
      setSyncingBatches(false);
      return;
    }

    const aggregates = buildBatchAggregates(
      (txRows || []) as PaymentTransaction[],
      (existingBatchRows || []) as ReconciliationBatch[],
    );

    if (aggregates.length > 0) {
      const { error: upsertError } = await supabase
        .from("payment_reconciliation_batches")
        .upsert(aggregates.map((batch) => {
          const existingBatch = (existingBatchRows || []).find((row: any) => row.gateway_batch_id === batch.gateway_batch_id) as ReconciliationBatch | undefined;
          const missingGateway = !existingBatch;
          const mismatchCategory = missingGateway
            ? "missing_gateway"
            : Math.abs(money(batch.local_amount) - money(existingBatch.gateway_amount || 0)) >= 0.01
              ? "amount_mismatch"
              : existingBatch.mismatch_category;

          return {
            ...existingBatch,
            ...batch,
            local_transaction_count: batch.transaction_count,
            missing_gateway_count: missingGateway ? batch.transaction_count : 0,
            mismatch_category: mismatchCategory,
            reconciliation_status: mismatchCategory ? "review_required" : existingBatch?.reconciliation_status || "unmatched",
            updated_at: new Date().toISOString(),
          };
        }), {
          onConflict: "gateway_batch_id",
        });

      if (upsertError) {
        toast({ title: "Batch sync failed", description: upsertError.message, variant: "destructive" });
        setSyncingBatches(false);
        return;
      }
    }

    await loadData();
    setSyncingBatches(false);
    toast({
      title: "Batches synced",
      description: `${aggregates.length} settlement batches were refreshed.`,
    });
  };

  const createBankDeposit = async () => {
    if (!newDeposit.depositDate || !newDeposit.bankAccountName || !newDeposit.depositAmount) {
      toast({
        title: "Missing deposit details",
        description: "Deposit date, bank account, and amount are required.",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(newDeposit.depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid deposit amount.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("bank_deposits").insert({
      deposit_date: newDeposit.depositDate,
      bank_account_name: newDeposit.bankAccountName,
      deposit_amount: amount,
      reference_number: newDeposit.referenceNumber || null,
      notes: newDeposit.notes || null,
    });

    if (error) {
      toast({ title: "Could not save deposit", description: error.message, variant: "destructive" });
      return;
    }

    setNewDeposit({
      depositDate: new Date().toISOString().slice(0, 10),
      bankAccountName: "",
      depositAmount: "",
      referenceNumber: "",
      notes: "",
    });

    await loadData();
    toast({ title: "Deposit added", description: "Bank deposit is ready for reconciliation." });
  };

  const createStatementEntry = async () => {
    if (!newStatement.statementDate || !newStatement.grossAmount) {
      toast({
        title: "Missing statement details",
        description: "Statement date and gross amount are required.",
        variant: "destructive",
      });
      return;
    }

    const grossAmount = Number(newStatement.grossAmount);
    const feeAmount = Number(newStatement.feeAmount || 0);
    const netAmount = newStatement.netAmount ? Number(newStatement.netAmount) : money(grossAmount - feeAmount);

    if (!Number.isFinite(grossAmount) || !Number.isFinite(feeAmount) || !Number.isFinite(netAmount)) {
      toast({
        title: "Invalid statement values",
        description: "Gross, fee, and net values must be valid numbers.",
        variant: "destructive",
      });
      return;
    }

    if (!validateStatementMath(grossAmount, feeAmount, netAmount)) {
      toast({
        title: "Statement math mismatch",
        description: "Net amount must equal gross amount minus fee amount.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("processor_statement_entries").insert({
      statement_date: newStatement.statementDate,
      bank_account_name: newStatement.bankAccountName || null,
      batch_reference: newStatement.batchReference || null,
      gross_amount: grossAmount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      notes: newStatement.notes || null,
    });

    if (error) {
      toast({ title: "Could not save statement entry", description: error.message, variant: "destructive" });
      return;
    }

    setNewStatement({
      statementDate: new Date().toISOString().slice(0, 10),
      bankAccountName: "",
      batchReference: "",
      grossAmount: "",
      feeAmount: "",
      netAmount: "",
      notes: "",
    });

    await loadData();
    toast({
      title: "Statement entry added",
      description: "Processor fees and net amount are now available for matching.",
    });
  };

  const importStatementCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingStatements(true);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) throw new Error("CSV file is empty or invalid.");

      const payload = rows.map((row) => {
        const grossAmount = Number(row.gross_amount || row.gross || 0);
        const feeAmount = Number(row.fee_amount || row.fee || 0);
        const netAmount = row.net_amount ? Number(row.net_amount) : money(grossAmount - feeAmount);

        return {
          statement_date: row.statement_date || row.date,
          bank_account_name: row.bank_account_name || row.bank_account || null,
          batch_reference: row.batch_reference || row.batch_id || null,
          gross_amount: grossAmount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          notes: row.notes || null,
        };
      });

      const invalidRow = payload.find((row) =>
        !row.statement_date ||
        !Number.isFinite(row.gross_amount) ||
        !Number.isFinite(row.fee_amount) ||
        !Number.isFinite(row.net_amount) ||
        !validateStatementMath(row.gross_amount, row.fee_amount, row.net_amount),
      );
      if (invalidRow) throw new Error("Each CSV row must include valid date, gross, fee, and net values where gross - fee = net.");

      const { error } = await supabase.from("processor_statement_entries").insert(payload);
      if (error) throw new Error(error.message);

      await loadData();
      toast({
        title: "Statement CSV imported",
        description: `${payload.length} processor statement rows were added.`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Could not import statement CSV.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
      setImportingStatements(false);
    }
  };

  const bulkAutoMatch = async () => {
    setBulkMatching(true);

    const availableStatements = [...statementEntries];
    const availableDeposits = [...deposits];
    let matchedCount = 0;

    for (const batch of batches) {
      const settlementDate = batch.settlement_date ? new Date(batch.settlement_date) : null;

      const selectedStatement = availableStatements.find((entry) => {
        if (entry.matched_batch_uuid && entry.matched_batch_uuid !== batch.id) return false;

        if (
          entry.batch_reference &&
          (entry.batch_reference === batch.gateway_batch_id ||
            entry.batch_reference === batch.gateway_batch_id.replace(/\D/g, ""))
        ) {
          return true;
        }

        const grossMatches = Math.abs(Number(entry.gross_amount || 0) - Number(batch.gateway_amount || 0)) < 0.01;
        if (!grossMatches) return false;
        if (!settlementDate) return true;

        const statementDate = new Date(entry.statement_date);
        const diffDays = Math.abs(statementDate.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 3;
      });

      let expectedNet = money(Number(batch.gateway_amount || 0));
      let processorFeeAmount = 0;
      let bankAccountName = batch.bank_account_name || null;
      let processorStatementEntryId: string | null = null;

      if (selectedStatement) {
        expectedNet = money(Number(selectedStatement.net_amount || 0));
        processorFeeAmount = money(Number(selectedStatement.fee_amount || 0));
        bankAccountName = selectedStatement.bank_account_name || bankAccountName;
        processorStatementEntryId = selectedStatement.id;
      }

      const selectedDeposit = availableDeposits.find((deposit) => {
        if (deposit.matched_batch_uuid && deposit.matched_batch_uuid !== batch.id) return false;

        const amountMatches = Math.abs(Number(deposit.deposit_amount || 0) - expectedNet) < 0.01;
        if (!amountMatches) return false;
        if (bankAccountName && deposit.bank_account_name !== bankAccountName) return false;
        if (!settlementDate) return true;

        const depositDate = new Date(deposit.deposit_date);
        const diffDays = Math.abs(depositDate.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 3;
      });

      const bankDepositAmount = selectedDeposit ? Number(selectedDeposit.deposit_amount || 0) : null;
      const differenceAmount =
        bankDepositAmount == null ? money(expectedNet) : money(bankDepositAmount - expectedNet);
      const netFormulaMismatch = selectedStatement
        ? !validateStatementMath(
            Number(selectedStatement.gross_amount || 0),
            Number(selectedStatement.fee_amount || 0),
            Number(selectedStatement.net_amount || 0),
          )
        : false;
      const mismatchCategory =
        netFormulaMismatch
          ? "net_formula_mismatch"
          : selectedStatement && statementEntries.some((entry) =>
              entry.id !== selectedStatement.id &&
              entry.batch_reference &&
              selectedStatement.batch_reference &&
              entry.batch_reference === selectedStatement.batch_reference,
            )
            ? "duplicate_statement_row"
            : selectedDeposit && deposits.some((deposit) =>
                deposit.id !== selectedDeposit.id &&
                deposit.deposit_date === selectedDeposit.deposit_date &&
                deposit.bank_account_name === selectedDeposit.bank_account_name &&
                Math.abs(Number(deposit.deposit_amount || 0) - Number(selectedDeposit.deposit_amount || 0)) < 0.01,
              )
              ? "duplicate_bank_deposit"
              : batch.missing_local_count > 0
                ? "missing_local"
                : batch.missing_gateway_count > 0
                  ? "missing_gateway"
                  : batch.mismatch_category;
      const reconciliationStatus =
        !mismatchCategory && selectedDeposit && Math.abs(differenceAmount) < 0.01
          ? "matched"
          : selectedDeposit || selectedStatement
            ? "review_required"
            : "unmatched";

      const { error: batchError } = await supabase
        .from("payment_reconciliation_batches")
        .update({
          processor_statement_entry_id: processorStatementEntryId,
          processor_fee_amount: processorFeeAmount,
          expected_net_amount: expectedNet,
          bank_deposit_id: selectedDeposit?.id || null,
          bank_account_name: selectedDeposit?.bank_account_name || bankAccountName,
          bank_deposit_date: selectedDeposit?.deposit_date || null,
          bank_deposit_amount: selectedDeposit?.deposit_amount || null,
          difference_amount: differenceAmount,
          mismatch_category: mismatchCategory,
          reconciliation_status: reconciliationStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batch.id);

      if (batchError) continue;

      if (selectedStatement) {
        await supabase
          .from("processor_statement_entries")
          .update({
            status: reconciliationStatus,
            matched_batch_id: batch.gateway_batch_id,
            matched_batch_uuid: batch.id,
            mismatch_category: mismatchCategory,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedStatement.id);

        selectedStatement.status = "matched";
      }

      if (selectedDeposit) {
        await supabase
          .from("bank_deposits")
          .update({
            status: reconciliationStatus,
            matched_batch_id: batch.gateway_batch_id,
            matched_batch_uuid: batch.id,
            mismatch_category: mismatchCategory,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedDeposit.id);

        selectedDeposit.status = "matched";
      }

      if (selectedStatement || selectedDeposit) matchedCount += 1;
    }

    await loadData();
    setBulkMatching(false);
    toast({
      title: "Bulk reconciliation finished",
      description: `${matchedCount} batches were matched against statement rows and/or bank deposits.`,
    });
  };

  const bankOptions = useMemo(() => {
    const values = new Set<string>();
    deposits.forEach((item) => item.bank_account_name && values.add(item.bank_account_name));
    statementEntries.forEach((item) => item.bank_account_name && values.add(item.bank_account_name));
    batches.forEach((item) => item.bank_account_name && values.add(item.bank_account_name));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [batches, deposits, statementEntries]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      if (bankFilter !== "all" && batch.bank_account_name !== bankFilter) {
        return false;
      }

      if (dateRange.startDate) {
        if (!batch.settlement_date || batch.settlement_date < dateRange.startDate) {
          return false;
        }
      }

      if (dateRange.endDate) {
        if (!batch.settlement_date || batch.settlement_date > dateRange.endDate) {
          return false;
        }
      }

      return true;
    });
  }, [batches, bankFilter, dateRange.endDate, dateRange.startDate]);

  const summary = useMemo(() => {
    const gross = filteredBatches.reduce((sum, item) => sum + Number(item.gateway_amount || 0), 0);
    const fees = filteredBatches.reduce((sum, item) => sum + Number(item.processor_fee_amount || 0), 0);
    const expectedNet = filteredBatches.reduce((sum, item) => sum + Number(item.expected_net_amount || 0), 0);
    const deposited = filteredBatches.reduce((sum, item) => sum + Number(item.bank_deposit_amount || 0), 0);

    return {
      gross: money(gross),
      fees: money(fees),
      expectedNet: money(expectedNet),
      deposited: money(deposited),
      matched: filteredBatches.filter((item) =>
        item.reconciliation_status === "matched" || item.reconciliation_status === "manually_resolved"
      ).length,
      reviewRequired: filteredBatches.filter((item) => item.reconciliation_status === "review_required").length,
    };
  }, [filteredBatches]);

  const exportSettlementBatchesCsv = useCallback(() => {
    const headers = [
      "Batch",
      "Settlement Date",
      "Gross",
      "Recorded in App",
      "Fees",
      "Expected Net",
      "Bank Deposit",
      "Difference",
      "Mismatch",
      "Status",
      "Bank Account",
      "Processor Statement Entry ID",
      "Bank Deposit ID",
      "Gateway Status",
      "Notes",
      "Last Synced At",
    ];

    const rows = filteredBatches.map((batch) => [
      batch.gateway_batch_id,
      batch.settlement_date || "",
      Number(batch.gateway_amount || 0).toFixed(2),
      Number(batch.local_amount || 0).toFixed(2),
      Number(batch.processor_fee_amount || 0).toFixed(2),
      Number(batch.expected_net_amount || 0).toFixed(2),
      batch.bank_deposit_amount != null ? Number(batch.bank_deposit_amount).toFixed(2) : "",
      Number(batch.difference_amount || 0).toFixed(2),
      batch.mismatch_category || "",
      batch.reconciliation_status || "",
      batch.bank_account_name || "",
      batch.processor_statement_entry_id || "",
      batch.bank_deposit_id || "",
      batch.gateway_status || "",
      batch.notes || "",
      batch.last_synced_at || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSuffix = format(new Date(), "yyyy-MM-dd");

    link.href = url;
    link.download = `settlement-batches-${dateSuffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredBatches]);

  const reconciliationBadge = (status: string) => {
    const styles: Record<string, string> = {
      matched: "bg-green-100 text-green-700",
      manually_resolved: "bg-blue-100 text-blue-700",
      review_required: "bg-amber-100 text-amber-700",
      unmatched: "bg-slate-100 text-slate-700",
    };

    return <Badge className={styles[status] || styles.unmatched}>{status.replace(/_/g, " ")}</Badge>;
  };

  const resolutionStatementOptions = useMemo(() => {
    if (!selectedBatch) return [];

    return statementEntries.filter((entry) => {
      if (entry.matched_batch_uuid && entry.matched_batch_uuid !== selectedBatch.id) return false;

      if (
        entry.batch_reference &&
        (entry.batch_reference === selectedBatch.gateway_batch_id ||
          entry.batch_reference === selectedBatch.gateway_batch_id.replace(/\D/g, ""))
      ) {
        return true;
      }

      const grossMatches =
        Math.abs(Number(entry.gross_amount || 0) - Number(selectedBatch.gateway_amount || 0)) < 0.01;
      if (!grossMatches) return false;

      if (!selectedBatch.settlement_date) return true;

      const statementDate = new Date(entry.statement_date);
      const settlementDate = new Date(selectedBatch.settlement_date);
      const diffDays = Math.abs(statementDate.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });
  }, [selectedBatch, statementEntries]);

  const resolutionDepositOptions = useMemo(() => {
    if (!selectedBatch) return [];

    const selectedStatement =
      resolutionState.statementEntryId !== "none"
        ? statementEntries.find((entry) => entry.id === resolutionState.statementEntryId)
        : undefined;
    const expectedNet = Number(
      selectedStatement?.net_amount ||
      selectedBatch.expected_net_amount ||
      selectedBatch.gateway_amount ||
      0,
    );
    const amountTolerance = Number(resolutionState.amountTolerance || 0.01);
    const dateWindowDays = Math.max(Number(resolutionState.dateWindowDays || 7), 0);

    return deposits.filter((deposit) => {
      if (deposit.matched_batch_uuid && deposit.matched_batch_uuid !== selectedBatch.id) return false;
      if (
        !resolutionState.ignoreBankName &&
        selectedBatch.bank_account_name &&
        deposit.bank_account_name &&
        deposit.bank_account_name !== selectedBatch.bank_account_name
      ) {
        return false;
      }

      const amountMatches = Math.abs(Number(deposit.deposit_amount || 0) - expectedNet) <= amountTolerance;
      if (!amountMatches) return false;

      if (!selectedBatch.settlement_date) return true;

      const depositDate = new Date(deposit.deposit_date);
      const settlementDate = new Date(selectedBatch.settlement_date);
      const diffDays = Math.abs(depositDate.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= dateWindowDays;
    });
  }, [deposits, resolutionState.amountTolerance, resolutionState.dateWindowDays, resolutionState.ignoreBankName, resolutionState.statementEntryId, selectedBatch, statementEntries]);

  const openResolutionDialog = (batch: ReconciliationBatch) => {
    setSelectedBatch(batch);
    setResolutionState({
      statementEntryId: batch.processor_statement_entry_id || "none",
      depositId: batch.bank_deposit_id || "none",
      notes: batch.notes || "",
      amountTolerance: "0.01",
      dateWindowDays: "7",
      ignoreBankName: false,
      manuallyResolved: batch.reconciliation_status === "manually_resolved",
    });
  };

  const closeResolutionDialog = () => {
    setSelectedBatch(null);
    setResolutionState({
      statementEntryId: "none",
      depositId: "none",
      notes: "",
      amountTolerance: "0.01",
      dateWindowDays: "7",
      ignoreBankName: false,
      manuallyResolved: false,
    });
  };

  const saveBatchResolution = async () => {
    if (!selectedBatch) return;

    setSavingResolution(true);

    const selectedStatement =
      resolutionState.statementEntryId !== "none"
        ? statementEntries.find((entry) => entry.id === resolutionState.statementEntryId)
        : undefined;
    const selectedDeposit =
      resolutionState.depositId !== "none"
        ? deposits.find((deposit) => deposit.id === resolutionState.depositId)
        : undefined;
    const previousStatementId = selectedBatch.processor_statement_entry_id;
    const previousDepositId = selectedBatch.bank_deposit_id;

    const expectedNet = money(
      selectedStatement
        ? Number(selectedStatement.net_amount || 0)
        : Number(selectedBatch.gateway_amount || 0),
    );
    const processorFeeAmount = money(Number(selectedStatement?.fee_amount || 0));
    const bankDepositAmount = selectedDeposit ? Number(selectedDeposit.deposit_amount || 0) : null;
    const differenceAmount =
      bankDepositAmount == null ? money(expectedNet) : money(bankDepositAmount - expectedNet);

    const mismatchCategory =
      selectedStatement && !validateStatementMath(
        Number(selectedStatement.gross_amount || 0),
        Number(selectedStatement.fee_amount || 0),
        Number(selectedStatement.net_amount || 0),
      )
        ? "net_formula_mismatch"
        : selectedBatch.missing_local_count > 0
          ? "missing_local"
          : selectedBatch.missing_gateway_count > 0
            ? "missing_gateway"
            : Math.abs(Number(selectedBatch.gateway_amount || 0) - Number(selectedBatch.local_amount || 0)) >= 0.01
              ? "amount_mismatch"
              : null;

    const reconciliationStatus =
      resolutionState.manuallyResolved
        ? "manually_resolved"
        : !mismatchCategory && selectedDeposit && Math.abs(differenceAmount) < 0.01
          ? "matched"
          : selectedDeposit || selectedStatement
            ? "review_required"
            : "unmatched";

    if (previousStatementId && previousStatementId !== selectedStatement?.id) {
      await supabase
        .from("processor_statement_entries")
        .update({
          status: "unmatched",
          matched_batch_id: null,
          matched_batch_uuid: null,
          mismatch_category: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", previousStatementId);
    }

    if (previousDepositId && previousDepositId !== selectedDeposit?.id) {
      await supabase
        .from("bank_deposits")
        .update({
          status: "unmatched",
          matched_batch_id: null,
          matched_batch_uuid: null,
          mismatch_category: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", previousDepositId);
    }

    const { error: batchError } = await supabase
      .from("payment_reconciliation_batches")
      .update({
        processor_statement_entry_id: selectedStatement?.id || null,
        processor_fee_amount: processorFeeAmount,
        expected_net_amount: expectedNet,
        bank_deposit_id: selectedDeposit?.id || null,
        bank_account_name: selectedDeposit?.bank_account_name || selectedStatement?.bank_account_name || selectedBatch.bank_account_name,
        bank_deposit_date: selectedDeposit?.deposit_date || null,
        bank_deposit_amount: selectedDeposit?.deposit_amount || null,
        difference_amount: differenceAmount,
        mismatch_category: mismatchCategory,
        reconciliation_status: reconciliationStatus,
        notes: resolutionState.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedBatch.id);

    if (batchError) {
      toast({ title: "Could not save resolution", description: batchError.message, variant: "destructive" });
      setSavingResolution(false);
      return;
    }

    if (selectedStatement) {
      await supabase
        .from("processor_statement_entries")
        .update({
          status: reconciliationStatus,
          matched_batch_id: selectedBatch.gateway_batch_id,
          matched_batch_uuid: selectedBatch.id,
          mismatch_category: mismatchCategory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedStatement.id);
    }

    if (selectedDeposit) {
      await supabase
        .from("bank_deposits")
        .update({
          status: reconciliationStatus,
          matched_batch_id: selectedBatch.gateway_batch_id,
          matched_batch_uuid: selectedBatch.id,
          mismatch_category: mismatchCategory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedDeposit.id);
    }

    await loadData();
    setSavingResolution(false);
    closeResolutionDialog();
    toast({
      title: "Batch updated",
      description: `Batch ${selectedBatch.gateway_batch_id} was updated.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Reconciliation</h1>
            <p className="text-muted-foreground">
              Match Authorize.Net settlement batches to processor fees and final bank deposits.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={syncGatewayStatuses} disabled={syncingGateway}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncingGateway ? "animate-spin" : ""}`} />
              Refresh Authorize
            </Button>
            <Button variant="outline" onClick={syncBatchesFromTransactions} disabled={syncingBatches}>
              <ArrowLeftRight className={`mr-2 h-4 w-4 ${syncingBatches ? "animate-spin" : ""}`} />
              Sync Batches
            </Button>
            <Button onClick={bulkAutoMatch} disabled={bulkMatching || loading}>
              <Wallet className={`mr-2 h-4 w-4 ${bulkMatching ? "animate-spin" : ""}`} />
              Bulk Auto Match
            </Button>
          </div>
        </div>

        <Card className="border-blue-200 bg-blue-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How To Use This Page</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-3">
              <div className="font-semibold">1. Refresh Authorize</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pull the latest settlement batches from Authorize.Net.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="font-semibold">2. Add Statement Rows</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter or import processor statement rows with gross, fee, and net.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="font-semibold">3. Add Bank Deposits</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Save the actual bank deposits that should match expected net amounts.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="font-semibold">4. Resolve Open Batches</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Use Bulk Auto Match first, then click any status badge to review manually.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">${summary.gross.toFixed(2)}</div><p className="text-sm text-muted-foreground">Authorize Gross</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">${summary.fees.toFixed(2)}</div><p className="text-sm text-muted-foreground">Processor Fees</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">${summary.expectedNet.toFixed(2)}</div><p className="text-sm text-muted-foreground">Expected Net</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">${summary.deposited.toFixed(2)}</div><p className="text-sm text-muted-foreground">Bank Deposited</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{summary.matched}</div><p className="text-sm text-muted-foreground">Matched / Resolved</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">{summary.reviewRequired}</div><p className="text-sm text-muted-foreground">Review Required</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Processor Statement Entry
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Add one processor statement row or import a CSV before trying manual batch resolution.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="statement-date">Statement Date</Label><Input id="statement-date" type="date" value={newStatement.statementDate} onChange={(e) => setNewStatement((prev) => ({ ...prev, statementDate: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="statement-bank">Bank Account</Label><Input id="statement-bank" value={newStatement.bankAccountName} onChange={(e) => setNewStatement((prev) => ({ ...prev, bankAccountName: e.target.value }))} placeholder="Checking 001" /></div>
                <div className="space-y-2"><Label htmlFor="statement-batch">Batch Reference</Label><Input id="statement-batch" value={newStatement.batchReference} onChange={(e) => setNewStatement((prev) => ({ ...prev, batchReference: e.target.value }))} placeholder="Authorize batch id" /></div>
                <div className="space-y-2"><Label htmlFor="statement-gross">Gross Amount</Label><Input id="statement-gross" value={newStatement.grossAmount} onChange={(e) => setNewStatement((prev) => ({ ...prev, grossAmount: e.target.value }))} placeholder="1000.00" /></div>
                <div className="space-y-2"><Label htmlFor="statement-fee">Fee Amount</Label><Input id="statement-fee" value={newStatement.feeAmount} onChange={(e) => setNewStatement((prev) => ({ ...prev, feeAmount: e.target.value }))} placeholder="25.00" /></div>
                <div className="space-y-2"><Label htmlFor="statement-net">Net Amount</Label><Input id="statement-net" value={newStatement.netAmount} onChange={(e) => setNewStatement((prev) => ({ ...prev, netAmount: e.target.value }))} placeholder="975.00" /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={createStatementEntry}>Save Statement Row</Button>
                <div>
                  <Input id="statement-csv" type="file" accept=".csv" className="hidden" onChange={importStatementCsv} />
                  <Label htmlFor="statement-csv" className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium">
                    <FileUp className={`mr-2 h-4 w-4 ${importingStatements ? "animate-spin" : ""}`} />
                    Import CSV
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                CSV columns supported: `statement_date` or `date`, `batch_reference` or `batch_id`, `gross_amount` or `gross`, `fee_amount` or `fee`, `net_amount`, `bank_account_name`.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Bank Deposit Entry
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Add the final bank deposit amount that should tie back to the expected net.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="deposit-date">Deposit Date</Label><Input id="deposit-date" type="date" value={newDeposit.depositDate} onChange={(e) => setNewDeposit((prev) => ({ ...prev, depositDate: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="deposit-bank">Bank Account</Label><Input id="deposit-bank" value={newDeposit.bankAccountName} onChange={(e) => setNewDeposit((prev) => ({ ...prev, bankAccountName: e.target.value }))} placeholder="Checking 001" /></div>
                <div className="space-y-2"><Label htmlFor="deposit-amount">Deposit Amount</Label><Input id="deposit-amount" value={newDeposit.depositAmount} onChange={(e) => setNewDeposit((prev) => ({ ...prev, depositAmount: e.target.value }))} placeholder="975.00" /></div>
                <div className="space-y-2"><Label htmlFor="deposit-reference">Reference</Label><Input id="deposit-reference" value={newDeposit.referenceNumber} onChange={(e) => setNewDeposit((prev) => ({ ...prev, referenceNumber: e.target.value }))} placeholder="Bank ref" /></div>
              </div>
              <Button onClick={createBankDeposit}>Save Deposit</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Settlement Batches</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click a status badge to review that batch. Start with rows marked `review required` or `unmatched`.
                </p>
              </div>
              <div className="w-full lg:w-auto">
                <div className="flex flex-col items-stretch gap-3 lg:min-w-[640px]">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto_auto]">
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(event) => setDateRange((prev) => ({ ...prev, startDate: event.target.value }))}
                      aria-label="Start settlement date"
                    />
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(event) => setDateRange((prev) => ({ ...prev, endDate: event.target.value }))}
                      aria-label="End settlement date"
                    />
                    {dateRange.startDate || dateRange.endDate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDateRange({ startDate: "", endDate: "" })}
                        className="w-full sm:w-auto"
                      >
                        Clear Date Filter
                      </Button>
                    ) : (
                      <div className="hidden sm:block" />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={exportSettlementBatchesCsv}
                      disabled={filteredBatches.length === 0}
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                  <Select value={bankFilter} onValueChange={setBankFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter by bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bank Accounts</SelectItem>
                      {bankOptions.map((bank) => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Settlement</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Recorded in App</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Expected Net</TableHead>
                  <TableHead>Bank Deposit</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Mismatch</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="py-8 text-center">Loading reconciliation data...</TableCell></TableRow>
                ) : filteredBatches.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No settlement batches found.</TableCell></TableRow>
                ) : (
                  filteredBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono">{batch.gateway_batch_id}</TableCell>
                      <TableCell>{batch.settlement_date ? format(new Date(batch.settlement_date), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell className="font-medium">${Number(batch.gateway_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>${Number(batch.local_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>${Number(batch.processor_fee_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>${Number(batch.expected_net_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>{batch.bank_deposit_amount != null ? `$${Number(batch.bank_deposit_amount).toFixed(2)}` : "-"}</TableCell>
                      <TableCell className={Math.abs(Number(batch.difference_amount || 0)) < 0.01 ? "" : "text-amber-600"}>
                        ${Number(batch.difference_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {batch.mismatch_category ? batch.mismatch_category.replace(/_/g, " ") : "-"}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="rounded-md"
                          onClick={() => openResolutionDialog(batch)}
                        >
                          {reconciliationBadge(batch.reconciliation_status)}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Processor Statement Rows</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch Ref</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center">Loading statement rows...</TableCell></TableRow>
                  ) : statementEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No statement rows yet.</TableCell></TableRow>
                  ) : (
                    statementEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.statement_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-mono">{entry.batch_reference || "-"}</TableCell>
                        <TableCell>${Number(entry.gross_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>${Number(entry.fee_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>${Number(entry.net_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{reconciliationBadge(entry.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Bank Deposits</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Matched Batch</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center">Loading deposits...</TableCell></TableRow>
                  ) : deposits.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No bank deposits yet.</TableCell></TableRow>
                  ) : (
                    deposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>{format(new Date(deposit.deposit_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{deposit.bank_account_name}</TableCell>
                        <TableCell>${Number(deposit.deposit_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{deposit.reference_number || "-"}</TableCell>
                        <TableCell className="font-mono">{deposit.matched_batch_id || "-"}</TableCell>
                        <TableCell>{reconciliationBadge(deposit.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={Boolean(selectedBatch)} onOpenChange={(open) => !open && closeResolutionDialog()}>
          <DialogContent
            className="sm:max-w-2xl"
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {selectedBatch ? `Resolve Batch ${selectedBatch.gateway_batch_id}` : "Resolve Batch"}
              </DialogTitle>
            </DialogHeader>
            {selectedBatch ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
                  Quick flow: pick a processor statement row first, then pick the matching bank deposit.
                  Use the advanced filters only if the correct bank deposit is not shown.
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Settlement Date</div>
                    <div>{selectedBatch.settlement_date || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Gateway Gross</div>
                    <div>${Number(selectedBatch.gateway_amount || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Local Amount</div>
                    <div>${Number(selectedBatch.local_amount || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current Mismatch</div>
                    <div>{selectedBatch.mismatch_category ? selectedBatch.mismatch_category.replace(/_/g, " ") : "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Processor Statement Row</Label>
                    <Select
                      value={resolutionState.statementEntryId}
                      onValueChange={(value) => setResolutionState((prev) => ({ ...prev, statementEntryId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a statement row" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No statement row</SelectItem>
                        {resolutionStatementOptions.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {`${entry.statement_date} | ${entry.batch_reference || "no ref"} | $${Number(entry.net_amount || 0).toFixed(2)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bank Deposit</Label>
                    <Select
                      value={resolutionState.depositId}
                      onValueChange={(value) => setResolutionState((prev) => ({ ...prev, depositId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a bank deposit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No bank deposit</SelectItem>
                        {resolutionDepositOptions.map((deposit) => (
                          <SelectItem key={deposit.id} value={deposit.id}>
                            {`${deposit.deposit_date} | ${deposit.bank_account_name} | $${Number(deposit.deposit_amount || 0).toFixed(2)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="resolution-amount-tolerance">Amount Tolerance</Label>
                    <Input
                      id="resolution-amount-tolerance"
                      value={resolutionState.amountTolerance}
                      onChange={(event) => setResolutionState((prev) => ({ ...prev, amountTolerance: event.target.value }))}
                      placeholder="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resolution-date-window">Date Window (Days)</Label>
                    <Input
                      id="resolution-date-window"
                      value={resolutionState.dateWindowDays}
                      onChange={(event) => setResolutionState((prev) => ({ ...prev, dateWindowDays: event.target.value }))}
                      placeholder="7"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 md:mt-7">
                    <div>
                      <div className="text-sm font-medium">Ignore Bank Name</div>
                      <div className="text-xs text-muted-foreground">Use this only if the right deposit is missing.</div>
                    </div>
                    <Switch
                      checked={resolutionState.ignoreBankName}
                      onCheckedChange={(checked) => setResolutionState((prev) => ({ ...prev, ignoreBankName: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={resolutionState.notes}
                    onChange={(event) => setResolutionState((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Add review notes for this batch"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">Mark as Manually Resolved</div>
                    <div className="text-xs text-muted-foreground">
                      Use this when the batch is valid but should close as an exception instead of a strict match.
                    </div>
                  </div>
                  <Switch
                    checked={resolutionState.manuallyResolved}
                    onCheckedChange={(checked) => setResolutionState((prev) => ({ ...prev, manuallyResolved: checked }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={closeResolutionDialog} disabled={savingResolution}>
                    Cancel
                  </Button>
                  <Button onClick={saveBatchResolution} disabled={savingResolution}>
                    {savingResolution ? "Saving..." : "Save Resolution"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
