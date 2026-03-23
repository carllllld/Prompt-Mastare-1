/**
 * Card Component Examples
 * 
 * This file demonstrates all variants of the Card component
 * as specified in Task 2.3 of the professional-ui-redesign spec.
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

export function CardExamples() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Card Variants</h2>
        
        {/* Default Variant */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Default Variant</h3>
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>This card uses the default variant with shadow-sm</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content goes here. The default variant provides a subtle shadow.</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>
        </div>

        {/* Elevated Variant */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Elevated Variant</h3>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>This card has shadow-md and hover:shadow-lg</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Hover over this card to see the shadow increase. Perfect for important content.</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>
        </div>

        {/* Flat Variant */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Flat Variant</h3>
          <Card variant="flat">
            <CardHeader>
              <CardTitle>Flat Card</CardTitle>
              <CardDescription>This card has no shadow and border-2</CardDescription>
            </CardHeader>
            <CardContent>
              <p>A flat design with a thicker border and no shadow. Clean and minimal.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Action</Button>
            </CardFooter>
          </Card>
        </div>

        {/* Interactive Variant */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Interactive Variant</h3>
          <Card variant="interactive">
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>This card has cursor-pointer and hover:shadow-md</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Click or hover over this card. Perfect for clickable cards in grids.</p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost">Learn More</Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Header and Footer Styles</h2>
        
        <Card>
          <CardHeader>
            <CardTitle>Card with Header Border</CardTitle>
            <CardDescription>The header has border-b border-border pb-4 mb-4</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Notice the border separating the header from the content.</p>
            <p className="mt-2">The footer below also has a border separator.</p>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">Footer with border-t border-border pt-4 mt-4</p>
          </CardFooter>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Simple Card (No Header/Footer)</h2>
        
        <Card>
          <CardContent className="pt-6">
            <p>A simple card with just content. No header or footer needed.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Requirements Validation:
 * 
 * ✓ Requirement 3.3: Card styling with proper shadows and borders
 * ✓ Requirement 4.4: Consistent card styling throughout interface
 * ✓ Requirement 5.1: Card elevation for result section
 * ✓ Requirement 7.2: Updated Card component in UI primitives
 * ✓ Requirement 8.2: Shadows create depth and separate content layers
 * ✓ Requirement 8.3: Border styles create subtle separation
 * ✓ Requirement 8.5: Appropriate elevation levels for cards
 * 
 * Implementation Details:
 * - Base: rounded-xl, border, bg-card, border-card-border
 * - Default variant: shadow-sm
 * - Elevated variant: shadow-md hover:shadow-lg transition-shadow
 * - Flat variant: shadow-none border-2
 * - Interactive variant: hover:shadow-md cursor-pointer transition-shadow
 * - Header: border-b border-border pb-4 mb-4
 * - Footer: border-t border-border pt-4 mt-4
 * - No inline styles used
 */
