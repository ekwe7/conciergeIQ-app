import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageHeader, Panel, PanelHeader, Stat } from '../components/ui/Page';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Operational metrics, order throughput, and revenue insights across your property."
        actions={
          <Button variant="secondary" className="gap-2">
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Export summary</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's Orders" value="42" detail="12% increase from yesterday" />
        <Stat label="Average Fulfillment Time" value="14 min" detail="Target under 20 minutes" />
        <Stat label="Gross Revenue" value="₦482,500" detail="Room service and amenities" />
        <Stat label="Active Stays" value="28 rooms" detail="78% occupancy rate" />
      </div>

      <Panel>
        <PanelHeader
          title="Daily Operational Overview"
          description="Performance summary across all hotel departments."
        />
        <div className="p-6 text-center text-sm text-ink-3">
          Detailed historical reporting and scheduled reconciliation reports are available for managers and property owners.
        </div>
      </Panel>
    </div>
  );
}
