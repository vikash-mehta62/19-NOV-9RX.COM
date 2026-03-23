# Legacy freeShipping Field Handling - Complete Guide

## 🎯 Problem Statement

There are TWO free shipping systems:
1. **Legacy**: `profile.freeShipping` (boolean) - Old "always free" flag
2. **New**: `profile.free_shipping_enabled` + threshold/custom rate/auto shipping

## ✅ Current Logic (Already Implemented)

### In `orderCalculations.ts`:

```typescript
// Priority 0 (HIGHEST): Legacy free shipping flag
if (hasFreeShipping) {
  return 0; // Always free, ignores everything else
}

// Priority 1: Profile free shipping (new system)
if (profileSettings?.free_shipping_enabled && subtotal >= threshold) {
  return 0;
}

// Priority 2-7: Other shipping logic...
```

**This is CORRECT!** ✅

## 🔧 What Needs to be Done

### 1. Update ViewProfileModal.tsx - Shipping Settings Card

Add warning when legacy flag is active:

```tsx
{/* Shipping Settings Card */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
    <CardTitle className="flex items-center gap-2">
      <Truck className="h-5 w-5" />
      Shipping Settings
    </CardTitle>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsShippingModalOpen(true)}
      disabled={profile.freeShipping}  // ← Disable edit if legacy active
    >
      <Settings className="h-4 w-4 mr-2" />
      Edit
    </Button>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Legacy Warning */}
    {profile.freeShipping && (
      <Alert className="border-amber-500 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Legacy Free Shipping Active:</strong> This customer has the old "Always Free Shipping" flag enabled. 
          All new shipping settings are bypassed. To use new settings, disable the legacy flag first.
        </AlertDescription>
      </Alert>
    )}

    <div className="grid gap-4 grid-cols-2">
      {/* Show legacy status */}
      <div>
        <p className="text-sm text-muted-foreground">
          Legacy Free Shipping (Old)
        </p>
        <Badge variant={profile.freeShipping ? "default" : "secondary"}>
          {profile.freeShipping ? "Active (Overrides All)" : "Inactive"}
        </Badge>
      </div>

      {/* Show new system status */}
      <div>
        <p className="text-sm text-muted-foreground">
          Free Shipping (New)
        </p>
        <Badge variant={profile.free_shipping_enabled ? "default" : "secondary"}>
          {profile.free_shipping_enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {/* Only show new settings if legacy is OFF */}
      {!profile.freeShipping && (
        <>
          {/* Free shipping threshold */}
          {profile.free_shipping_enabled && (
            <div>
              <p className="text-sm text-muted-foreground">
                Free Shipping Threshold
              </p>
              <p className="font-medium">
                {profile.free_shipping_threshold === 0
                  ? "Always Free"
                  : `$${profile.free_shipping_threshold}`}
              </p>
            </div>
          )}

          {/* Custom rate */}
          <div>
            <p className="text-sm text-muted-foreground">
              Custom Shipping Rate
            </p>
            <p className="font-medium">
              {profile.custom_shipping_rate
                ? `$${profile.custom_shipping_rate}`
                : "Not Set"}
            </p>
          </div>

          {/* Auto shipping */}
          <div>
            <p className="text-sm text-muted-foreground">
              Auto Shipping Charges
            </p>
            <Badge variant={profile.auto_shipping_enabled ? "default" : "secondary"}>
              {profile.auto_shipping_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {profile.auto_shipping_enabled && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">
                  Auto Shipping Threshold
                </p>
                <p className="font-medium">
                  ${profile.auto_shipping_threshold || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Auto Shipping Amount
                </p>
                <p className="font-medium">
                  ${profile.auto_shipping_amount || 0}
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  </CardContent>
</Card>
```

### 2. Update ShippingSettingsEditModal.tsx

Add warning at top of modal:

```tsx
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle className="flex items-center gap-2">
      <Truck className="h-5 w-5" />
      Customer Shipping Settings
    </DialogTitle>
  </DialogHeader>

  <div className="space-y-6 py-4">
    {/* Legacy Warning */}
    {currentSettings.legacyFreeShipping && (
      <Alert className="border-amber-500 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Warning:</strong> This customer has the legacy "Always Free Shipping" flag enabled. 
          These settings will not take effect until the legacy flag is disabled.
        </AlertDescription>
      </Alert>
    )}

    {/* Rest of the form... */}
  </div>
</DialogContent>
```

## 📊 Priority Flow Chart

```
Order Created
    ↓
Check Legacy freeShipping flag
    ↓
  YES → Return $0 (DONE) ✅
    ↓
   NO
    ↓
Check Profile free_shipping_enabled
    ↓
  YES & threshold met → Return $0 ✅
    ↓
   NO
    ↓
Check Profile custom_shipping_rate
    ↓
  SET → Return custom rate ✅
    ↓
  NOT SET
    ↓
Check Profile auto_shipping
    ↓
  ENABLED & below threshold → Return auto charge ✅
    ↓
   NO
    ↓
Check Global free shipping
    ↓
  ENABLED & threshold met → Return $0 ✅
    ↓
   NO
    ↓
Check Global auto shipping
    ↓
  ENABLED & below threshold → Return global charge ✅
    ↓
   NO
    ↓
Return default/product shipping ✅
```

## 🧪 Test Cases

### Case 1: Legacy Active
```
profile.freeShipping = true
profile.free_shipping_enabled = true
profile.custom_shipping_rate = 10

Result: $0 (legacy overrides everything)
```

### Case 2: Legacy Inactive, New System Active
```
profile.freeShipping = false
profile.free_shipping_enabled = true
profile.free_shipping_threshold = 100
cart = $150

Result: $0 (new system works)
```

### Case 3: Both Inactive
```
profile.freeShipping = false
profile.free_shipping_enabled = false
profile.custom_shipping_rate = null
global.default_shipping_rate = 30

Result: $30 (falls back to global)
```

## ✅ Summary

1. **Logic is already correct** in `orderCalculations.ts`
2. **UI needs update** to show legacy warning
3. **Edit button should be disabled** when legacy is active
4. **Modal should show warning** if legacy is active

This ensures no confusion and proper migration path from old to new system!
