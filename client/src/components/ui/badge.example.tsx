import { Badge } from './badge'

/**
 * Badge Component Examples
 * 
 * Demonstrates all variants and sizes of the Badge component
 * using semantic colors from the design system.
 */
export function BadgeExamples() {
  return (
    <div className="p-8 space-y-8 bg-background">
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Badge Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Badge Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge size="sm">Small</Badge>
          <Badge size="default">Default</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Semantic Colors</h2>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" size="sm">Approved</Badge>
            <Badge variant="success">Payment Received</Badge>
            <Badge variant="success" size="lg">Completed</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning" size="sm">Pending</Badge>
            <Badge variant="warning">Review Required</Badge>
            <Badge variant="warning" size="lg">Attention Needed</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="error" size="sm">Failed</Badge>
            <Badge variant="error">Rejected</Badge>
            <Badge variant="error" size="lg">Critical Error</Badge>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Real-World Examples</h2>
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">User Status</span>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
          
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Subscription Tier</span>
              <Badge variant="default">Premium</Badge>
            </div>
          </div>
          
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Text Quality</span>
              <Badge variant="warning">Needs Review</Badge>
            </div>
          </div>
          
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">API Status</span>
              <Badge variant="error">Connection Failed</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Multiple Badges</h2>
        <div className="p-4 border border-border rounded-lg space-y-2">
          <h3 className="text-base font-semibold text-foreground">Property Listing</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" size="sm">Verified</Badge>
            <Badge variant="default" size="sm">Premium</Badge>
            <Badge variant="outline" size="sm">3 rum</Badge>
            <Badge variant="outline" size="sm">Stockholm</Badge>
            <Badge variant="secondary" size="sm">Nyproduktion</Badge>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">On Different Backgrounds</h2>
        <div className="space-y-4">
          <div className="p-4 bg-background border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">On white background:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
            </div>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">On muted background:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default BadgeExamples
