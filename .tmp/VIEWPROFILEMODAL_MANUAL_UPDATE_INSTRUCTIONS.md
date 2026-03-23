# ViewProfileModal Shipping Settings Card - MANUAL UPDATE REQUIRED

## ⚠️ CRITICAL: Manual Update Needed

The automated string replacement failed due to whitespace matching issues. You need to manually update the Shipping Settings card in ViewProfileModal.

## 📍 Location
**File:** `src/components/users/ViewProfileModal.tsx`  
**Line:** 2018 (CardContent opening tag)  
**Section:** Shipping Settings Card

## 🔍 Find This Code (Starting at Line 2018):

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

## ✅ Replace With This Code:

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

## 🎯 Key Changes Made:

1. **Changed CardContent wrapper**: From `className={cn("grid gap-4", ...)}` to `className="space-y-4"`
2. **Added Legacy Warning Banner**: Amber-colored warning when `profile.freeShipping` is true
3. **Added "Legacy Free Shipping" field**: Shows "Active (Overrides All)" or "Inactive"
4. **Renamed old "Free Shipping"**: Now called "Free Shipping (New)"
5. **Conditional Display**: Threshold/amounts only show when legacy is NOT active (`!profile.freeShipping`)
6. **Grid Layout**: Moved inside the space-y-4 wrapper for proper spacing

## 📋 Steps to Apply:

1. Open `src/components/users/ViewProfileModal.tsx` in your editor
2. Go to line 2018 (or search for "Shipping Settings Card")
3. Select the entire `<CardContent>...</CardContent>` block
4. Replace it with the new code above
5. Save the file

## ✅ Expected Result:

After the update, the Shipping Settings card will display:
- **Legacy Free Shipping**: Badge showing "Active (Overrides All)" or "Inactive"
- **Warning Banner**: When legacy is active, shows amber warning
- **Free Shipping (New)**: The new profile-specific setting
- **All other fields**: Only visible when legacy is NOT overriding

## 🧪 Testing:

1. Open ViewProfileModal for a customer with `freeShipping: true`
   - Should see amber warning banner
   - Should see "Legacy Free Shipping: Active (Overrides All)"
   - Threshold/amounts should be hidden

2. Open ViewProfileModal for a customer with `freeShipping: false`
   - No warning banner
   - Should see "Legacy Free Shipping: Inactive"
   - Should see all new shipping settings

---

**Status**: ⚠️ MANUAL UPDATE REQUIRED - Apply this change to complete the implementation
