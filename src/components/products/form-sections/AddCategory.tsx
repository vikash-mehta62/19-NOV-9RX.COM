import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  X, 
  Package, 
  Ruler, 
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  onAddSuccess?: () => void;
}

const DEFAULT_UNITS = ["unit", "OZ", "mm", "mL", "cc", "inch", "gram", "dram", "ROLL"];

const CategoryAddDialog: React.FC<Props> = ({ open, onOpenChange, onAddSuccess }) => {
  const [categoryName, setCategoryName] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [defaultUnit, setDefaultUnit] = useState('');
  const [hasRolls, setHasRolls] = useState(false);
  const [requiresCase, setRequiresCase] = useState(false);
  const [customUnit, setCustomUnit] = useState('');
  const [loading, setLoading] = useState(false);
  const [customUnits, setCustomUnits] = useState<string[]>([]);

  const addCustomUnit = () => {
    const trimmedUnit = customUnit.trim().toUpperCase();
    
    if (!trimmedUnit) {
      toast.error('Please enter a unit name');
      return;
    }
    
    if (DEFAULT_UNITS.includes(trimmedUnit) || customUnits.includes(trimmedUnit)) {
      toast.error('This unit already exists');
      return;
    }
    
    setCustomUnits([...customUnits, trimmedUnit]);
    setSelectedUnits([...selectedUnits, trimmedUnit]);
    setCustomUnit('');
    toast.success(`Added custom unit: ${trimmedUnit}`);
  };

  const toggleUnit = (unit: string) => {
    setSelectedUnits(prev => {
      const newUnits = prev.includes(unit) 
        ? prev.filter(u => u !== unit) 
        : [...prev, unit];
      
      // If removing the default unit, clear it
      if (!newUnits.includes(defaultUnit)) {
        setDefaultUnit('');
      }
      
      return newUnits;
    });
  };

  const removeCustomUnit = (unit: string) => {
    setCustomUnits(prev => prev.filter(u => u !== unit));
    setSelectedUnits(prev => prev.filter(u => u !== unit));
    if (defaultUnit === unit) {
      setDefaultUnit('');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!categoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    if (selectedUnits.length === 0) {
      toast.error('Please select at least one size unit');
      return;
    }
    
    if (!defaultUnit) {
      toast.error('Please select a default unit');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.from('category_configs').insert({
        category_name: categoryName.trim(),
        size_units: selectedUnits,
        default_unit: defaultUnit,
        has_rolls: hasRolls,
        requires_case: requiresCase,
      });

      if (error) throw error;

      toast.success('Category added successfully!', {
        description: `${categoryName} has been added to your categories.`
      });
      
      // Reset form
      setCategoryName('');
      setSelectedUnits([]);
      setDefaultUnit('');
      setHasRolls(false);
      setRequiresCase(false);
      setCustomUnits([]);
      
      onOpenChange(false);
      onAddSuccess?.();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category', {
        description: 'Please try again or contact support.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customUnit.trim()) {
      e.preventDefault();
      addCustomUnit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-purple-500" />
            Add New Product Category
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="category-name" className="text-sm font-medium">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category-name"
              placeholder="e.g., Pharmacy Supplies, RX Labels, etc."
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="h-10"
              disabled={loading}
            />
          </div>

          {/* Size Units Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Size Units <span className="text-red-500">*</span>
            </Label>
            
            {/* Selected Units Display */}
            {selectedUnits.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                {selectedUnits.map(unit => (
                  <Badge 
                    key={unit} 
                    variant="secondary"
                    className="bg-white border-purple-300 text-purple-700 uppercase"
                  >
                    {unit}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500"
                      onClick={() => toggleUnit(unit)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Default Units Grid */}
            <Card className="border-gray-200">
              <CardContent className="p-3">
                <ScrollArea className="h-32 pr-4">
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_UNITS.map(unit => (
                      <label
                        key={unit}
                        className={`
                          flex items-center space-x-2 p-2 rounded-lg cursor-pointer
                          transition-colors duration-200
                          ${selectedUnits.includes(unit) 
                            ? 'bg-purple-100 border border-purple-300' 
                            : 'hover:bg-gray-50 border border-transparent'
                          }
                        `}
                      >
                        <Checkbox
                          checked={selectedUnits.includes(unit)}
                          onCheckedChange={() => toggleUnit(unit)}
                          disabled={loading}
                          className="data-[state=checked]:bg-purple-500"
                        />
                        <span className="text-sm font-medium uppercase">{unit}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Custom Units Section */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Add Custom Unit</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom unit (e.g., TAB, CAP)"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="h-9"
                />
                <Button 
                  type="button" 
                  onClick={addCustomUnit}
                  disabled={loading || !customUnit.trim()}
                  size="sm"
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {/* Display Custom Units */}
              {customUnits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customUnits.map(unit => (
                    <Badge 
                      key={unit} 
                      className="bg-green-100 text-green-700 border-green-300 uppercase"
                    >
                      {unit}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500"
                        onClick={() => removeCustomUnit(unit)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Default Unit Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Default Unit <span className="text-red-500">*</span>
            </Label>
            <Select value={defaultUnit} onValueChange={setDefaultUnit} disabled={loading}>
              <SelectTrigger className={!defaultUnit ? "text-gray-400" : ""}>
                <SelectValue placeholder="Select default unit from selected units" />
              </SelectTrigger>
              <SelectContent>
                {selectedUnits.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    Please select size units first
                  </div>
                ) : (
                  selectedUnits.map(unit => (
                    <SelectItem key={unit} value={unit} className="uppercase">
                      {unit}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Configuration Options */}
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                Configuration Options
              </Label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox 
                    id="rolls" 
                    checked={hasRolls} 
                    onCheckedChange={(checked) => setHasRolls(!!checked)}
                    disabled={loading}
                    className="data-[state=checked]:bg-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium">Has Rolls</span>
                    <p className="text-xs text-gray-500">Enable if products come in rolls (e.g., labels)</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox 
                    id="case" 
                    checked={requiresCase} 
                    onCheckedChange={(checked) => setRequiresCase(!!checked)}
                    disabled={loading}
                    className="data-[state=checked]:bg-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium">Requires Case</span>
                    <p className="text-xs text-gray-500">Products must be sold in cases</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Validation Alert */}
          {selectedUnits.length > 0 && !defaultUnit && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-800">
                Please select a default unit from your selected units
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !categoryName || selectedUnits.length === 0 || !defaultUnit}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add Category
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryAddDialog;