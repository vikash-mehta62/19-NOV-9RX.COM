import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Camera, X, Search } from 'lucide-react';
import { supabase } from '@/supabaseClient';

interface BarcodeScannerProps {
  onScan: (productId: string, sku: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose
}) => {
  const [scanning, setScanning] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanning = async () => {
    try {
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          await lookupProduct(decodedText);
        },
        (errorMessage) => {
          // Scanning error (can be ignored)
        }
      );

      setScanning(true);
      setError('');
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check permissions.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const lookupProduct = async (sku: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name')
        .eq('sku', sku)
        .single();

      if (error || !data) {
        setError(`Product not found: ${sku}`);
        return;
      }

      onScan(data.id, data.sku);
    } catch (err) {
      console.error('Error looking up product:', err);
      setError('Failed to lookup product');
    }
  };

  const handleManualLookup = async () => {
    if (!manualSku.trim()) return;
    await lookupProduct(manualSku.trim());
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Scan Barcode</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4">
        <div id="barcode-reader" className="w-full" />
        
        {!scanning && (
          <Button
            onClick={startScanning}
            className="w-full mt-4"
            variant="default"
          >
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        )}

        {scanning && (
          <Button
            onClick={stopScanning}
            className="w-full mt-4"
            variant="destructive"
          >
            Stop Scanning
          </Button>
        )}
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-gray-600 mb-2">Or enter SKU manually:</p>
        <div className="flex gap-2">
          <Input
            value={manualSku}
            onChange={(e) => setManualSku(e.target.value)}
            placeholder="Enter SKU"
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleManualLookup();
            }}
          />
          <Button onClick={handleManualLookup}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
    </Card>
  );
};
