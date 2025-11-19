import { Button } from "@/components/ui/button";

interface GroupPricingHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export function GroupPricingHeader({ loading, onRefresh }: GroupPricingHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-800">Group Pricing Configurations</h2>
      <Button 
        disabled={loading} 
        onClick={onRefresh}
        className="bg-gradient-to-r from-[#e6b980] to-[#eacda3] hover:opacity-90 text-gray-800"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
            <span>Refreshing...</span>
          </div>
        ) : (
          "Refresh"
        )}
      </Button>
    </div>
  );
}