# ViewProfileModal Shipping Settings Card - Manual Update Required

## Location
File: `src/components/users/ViewProfileModal.tsx`  
Line: ~2020 (search for "Shipping Settings Card")

## Find This Code:

```tsx
<CardContent className={cn("grid gap-4", isCompact ? "grid-cols-1" : "grid-cols-2")}>
  <div>
    <p className="text-sm text-muted-foreground">
      Free Shipping
    </p>
    <Badge
      variant={profile.free_shipping_enabled ? "default" : "secondary"}
    >
      {profile.free_shipping_enabled ? "Enabled" : "Disabled"}
    </Badge>
  </div>
  {profile.free_shipping_enabled && (
    <div>
      <p className="text-sm text-muted-foreground">
        Free Shipping Threshold
      </p>
      <p className="font-medium">
        {profile.free_shipping_threshold === 0
          ? "Always Free"
          : `${profile.free_shipping_threshold || 0}`}
      </p>
    </div>
  )}
  <div>
    <p className="text-sm text-muted-foreground">
      Custom Shipping Rate
    </p>
    <p className="font-medium">
      {profile.custom_shipping_rate
        ? `${profile.custom_shipping_rate}`
        : "Not Set"}
    </p>
  </div>
  <div>
    <p className="text-sm text-muted-foreground">
      Auto Shipping Charges
    </p>
    <Badge
      variant={profile.auto_shipping_enabled ? "default" : "secondary"}
    >
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
</CardContent>
```

## Replace With This Code:

```tsx
<CardContent className="space-y-4">
  {/* Legacy Free Shipping Warning */}
  {profile.freeShipping && (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
      <p className="text-sm text-amber-900 font-medium">
        ⚠️ <strong>Legacy Free Shipping Active:</strong> Customer receives free shipping on ALL orders (overrides all settings below)
      </p>
    </div>
  )}

  <div className={cn("grid gap-4", isCompact ? "grid-cols-1" : "grid-cols-2")}>
    {/* Legacy Free Shipping */}
    <div>
      <p className="text-sm text-muted-foreground">
        Legacy Free Shipping
      </p>
      <Badge
        variant={profile.freeShipping ? "default" : "secondary"}
      >
        {profile.freeShipping ? "Active (Overrides All)" : "Inactive"}
      </Badge>
    </div>

    {/* New Free Shipping */}
    <div>
      <p className="text-sm text-muted-foreground">
        Free Shipping (New)
      </p>
      <Badge
        variant={profile.free_shipping_enabled ? "default" : "secondary"}
      >
        {profile.free_shipping_enabled ? "Enabled" : "Disabled"}
      </Badge>
    </div>

    {profile.free_shipping_enabled && !profile.freeShipping && (
      <div>
        <p className="text-sm text-muted-foreground">
          Free Shipping Threshold
        </p>
        <p className="font-medium">
          {profile.free_shipping_threshold === 0
            ? "Always Free"
            : `$${profile.free_shipping_threshold || 0}`}
        </p>
      </div>
    )}

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

    <div>
      <p className="text-sm text-muted-foreground">
        Auto Shipping Charges
      </p>
      <Badge
        variant={profile.auto_shipping_enabled ? "default" : "secondary"}
      >
        {profile.auto_shipping_enabled ? "Enabled" : "Disabled"}
      </Badge>
    </div>

    {profile.auto_shipping_enabled && !profile.freeShipping && (
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
  </div>
</CardContent>
```

## Key Changes:

1. ✅ Changed `CardContent` from `grid` to `space-y-4` wrapper
2. ✅ Added amber warning banner when `profile.freeShipping` is true
3. ✅ Added "Legacy Free Shipping" field showing "Active (Overrides All)" or "Inactive"
4. ✅ Renamed old "Free Shipping" to "Free Shipping (New)"
5. ✅ Only show threshold/amounts when legacy is NOT active (`!profile.freeShipping`)
6. ✅ Grid layout moved inside the space-y-4 wrapper

## Result:

Now the UI will show:
- **Legacy Free Shipping**: Active/Inactive badge
- **Free Shipping (New)**: Enabled/Disabled badge
- Warning banner when legacy is active
- All other fields hidden when legacy overrides them
