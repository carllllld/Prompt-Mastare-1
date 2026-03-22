/**
 * Test script for emergency fallback system
 * Tests text generation WITHOUT making OpenAI API calls
 * 
 * Usage: npx tsx script/test-fallback-system.ts
 */

import { PerfectSwedishFallback } from '../server/lib/perfect-swedish-fallback';

// Test data - Swedish property
const testDisposition = {
  property: {
    type: 'villa',
    address: 'Ekorrvägen 10, Mörtnäs, Värmdö',
    size: 146,
    living_area: 146,
    rooms: 5,
    bedrooms: 3,
    bathrooms: 2,
    materials: {
      kitchen: 'renoverat kök med köksö från 2021',
      bathroom: 'helkaklat badrum med golvvärme'
    },
    layout: 'öppna sällskapsytor mellan kök och vardagsrum',
    outdoor_space: {
      type: 'uteplats',
      direction: 'söder',
      size: '25 kvm'
    },
    renovations: ['nya fönster 2020', 'tilläggsisolering'],
    parking: 'garage med laddbox för elbil'
  },
  location: {
    address: 'Ekorrvägen 10, Mörtnäs, Värmdö',
    area: 'Mörtnäs',
    municipality: 'Värmdö',
    transport: 'buss 25 minuter till Slussen',
    amenities: ['Willys Värmdö', 'Kikka'],
    services: ['ICA Supermarket', 'Apotek']
  },
  financial: {
    fee: 0,
    price: 4850000
  },
  unique_features: ['söderläge', 'lugnt läge', 'fri utsikt']
};

console.log('🧪 Testing Emergency Fallback System (NO API CALLS)\n');
console.log('='.repeat(60));

const fallback = new PerfectSwedishFallback();

// Test 1: Balanced style
console.log('\n📝 Test 1: Balanced Style');
console.log('-'.repeat(60));
try {
  const result = fallback.generate({
    disposition: testDisposition,
    style: 'balanced',
    platform: 'hemnet',
    userId: 'test-user',
    sessionId: 'test-session',
    originalError: new Error('Test error')
  });

  console.log('✅ Generation successful!');
  console.log('\nMain Text:');
  console.log(result.improvedPrompt);
  console.log('\nHeadline:', result.headline);
  console.log('Social Copy:', result.socialCopy);
  console.log('Instagram Caption:', result.instagramCaption);
  console.log('Showing Invitation:', result.showingInvitation);
  console.log('Short Ad:', result.shortAd);
  console.log('\nMetrics:', {
    duration: `${result.metrics.totalDuration}ms`,
    success: result.metrics.success,
    isFallback: result.isFallback
  });
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Test 2: Factual style
console.log('\n\n📝 Test 2: Factual Style');
console.log('-'.repeat(60));
try {
  const result = fallback.generate({
    disposition: testDisposition,
    style: 'factual',
    platform: 'booli',
    userId: 'test-user',
    sessionId: 'test-session',
    originalError: new Error('Test error')
  });

  console.log('✅ Generation successful!');
  console.log('\nMain Text:');
  console.log(result.improvedPrompt);
  console.log('\nWord count:', result.improvedPrompt.split(/\s+/).filter(Boolean).length);
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Test 3: Selling style
console.log('\n\n📝 Test 3: Selling Style');
console.log('-'.repeat(60));
try {
  const result = fallback.generate({
    disposition: testDisposition,
    style: 'selling',
    platform: 'hemnet',
    userId: 'test-user',
    sessionId: 'test-session',
    originalError: new Error('Test error')
  });

  console.log('✅ Generation successful!');
  console.log('\nMain Text:');
  console.log(result.improvedPrompt);
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Test 4: Apartment (different property type)
console.log('\n\n📝 Test 4: Apartment Property');
console.log('-'.repeat(60));
const apartmentDisposition = {
  property: {
    type: 'lägenhet',
    address: 'Storgatan 12, 3 tr, Linköping',
    size: 76,
    living_area: 76,
    rooms: 3,
    bedrooms: 2,
    materials: {
      kitchen: 'renoverat 2022 med luckor från Ballingslöv',
      bathroom: 'helkaklat badrum från 2019'
    },
    balcony: {
      exists: true,
      type: 'balkong',
      direction: 'söder'
    }
  },
  location: {
    address: 'Storgatan 12, 3 tr, Linköping',
    area: 'Centrala Linköping',
    transport: 'Resecentrum fem minuter bort',
    amenities: ['ICA Supermarket', 'Systembolaget']
  },
  financial: {
    fee: 3900,
    price: 2850000
  }
};

try {
  const result = fallback.generate({
    disposition: apartmentDisposition,
    style: 'balanced',
    platform: 'hemnet',
    userId: 'test-user',
    sessionId: 'test-session',
    originalError: new Error('Test error')
  });

  console.log('✅ Generation successful!');
  console.log('\nMain Text:');
  console.log(result.improvedPrompt);
  console.log('\nHeadline:', result.headline);
} catch (error) {
  console.error('❌ Test failed:', error);
}

console.log('\n' + '='.repeat(60));
console.log('✅ All fallback tests completed!');
console.log('💰 Cost: $0.00 (no API calls made)');
console.log('='.repeat(60));
