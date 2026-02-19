import { useState, useEffect } from 'react';
import { Check, AlertCircle, TrendingUp, Users, Clock, Target } from 'lucide-react';

interface ConversionMetrics {
  freeToProRate: number;
  proToPremiumRate: number;
  churnRate: number;
  timeToConversion: number;
  activationRate: number;
  retentionRate: number;
}

interface ConversionData {
  current: ConversionMetrics;
  benchmark: ConversionMetrics;
  improvements: {
    metric: keyof ConversionMetrics;
    impact: 'high' | 'medium' | 'low';
    description: string;
    implementation: string;
  }[];
}

export function ConversionOptimizer() {
  const [data, setData] = useState<ConversionData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<keyof ConversionMetrics | null>(null);

  useEffect(() => {
    // Simulated data - in production this would come from analytics
    const mockData: ConversionData = {
      current: {
        freeToProRate: 0.18, // 18%
        proToPremiumRate: 0.10, // 10%
        churnRate: 0.06, // 6%
        timeToConversion: 14, // days
        activationRate: 0.72, // 72%
        retentionRate: 0.94 // 94%
      },
      benchmark: {
        freeToProRate: 0.15, // Industry average 15%
        proToPremiumRate: 0.08, // Industry average 8%
        churnRate: 0.08, // Industry average 8%
        timeToConversion: 21, // Industry average 21 days
        activationRate: 0.65, // Industry average 65%
        retentionRate: 0.90 // Industry average 90%
      },
      improvements: [
        {
          metric: 'freeToProRate',
          impact: 'high',
          description: 'Öka free→pro konvertering från 18% till 25%',
          implementation: 'Implementera usage-based prompts, limit features efter 2 texter, visa Pro-fördelar vid gräns'
        },
        {
          metric: 'timeToConversion',
          impact: 'high',
          description: 'Minska konverteringstid från 14 till 8 dagar',
          implementation: 'Onboarding tour, progress indicators, early value demonstration, usage reminders'
        },
        {
          metric: 'activationRate',
          impact: 'medium',
          description: 'Öka aktiveringsgrad från 72% till 85%',
          implementation: 'Interactive onboarding, first-user guidance, success metrics, quick wins'
        },
        {
          metric: 'churnRate',
          impact: 'medium',
          description: 'Minska churn från 6% till 4%',
          implementation: 'Proactive engagement, value reminders, usage analytics, retention emails'
        },
        {
          metric: 'proToPremiumRate',
          impact: 'low',
          description: 'Öka pro→premium konvertering från 10% till 15%',
          implementation: 'Advanced feature highlights, team collaboration demo, usage-based upselling'
        },
        {
          metric: 'retentionRate',
          impact: 'low',
          description: 'Öka retention från 94% till 96%',
          implementation: 'Loyalty rewards, feature announcements, community building, feedback loops'
        }
      ]
    };
    
    setData(mockData);
  }, []);

  const getMetricIcon = (metric: keyof ConversionMetrics) => {
    switch (metric) {
      case 'freeToProRate':
      case 'proToPremiumRate':
        return <TrendingUp className="w-5 h-5" />;
      case 'churnRate':
        return <AlertCircle className="w-5 h-5" />;
      case 'timeToConversion':
        return <Clock className="w-5 h-5" />;
      case 'activationRate':
      case 'retentionRate':
        return <Users className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getMetricLabel = (metric: keyof ConversionMetrics) => {
    switch (metric) {
      case 'freeToProRate':
        return 'Free → Pro';
      case 'proToPremiumRate':
        return 'Pro → Premium';
      case 'churnRate':
        return 'Churn Rate';
      case 'timeToConversion':
        return 'Tid till Konvertering';
      case 'activationRate':
        return 'Aktiveringsgrad';
      case 'retentionRate':
        return 'Retention';
      default:
        return metric;
    }
  };

  const formatMetricValue = (metric: keyof ConversionMetrics, value: number) => {
    switch (metric) {
      case 'freeToProRate':
      case 'proToPremiumRate':
      case 'churnRate':
      case 'activationRate':
      case 'retentionRate':
        return `${(value * 100).toFixed(1)}%`;
      case 'timeToConversion':
        return `${value} dagar`;
      default:
        return value.toString();
    }
  };

  const getPerformanceColor = (current: number, benchmark: number, metric: keyof ConversionMetrics) => {
    if (metric === 'churnRate' || metric === 'timeToConversion') {
      return current < benchmark ? 'text-green-600' : 'text-red-600';
    }
    return current > benchmark ? 'text-green-600' : 'text-red-600';
  };

  const getImpactColor = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Konverteringsoptimering</h1>
        <p className="text-gray-600">Analysera och förbättra användarkonvertering och retention</p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {(Object.keys(data.current) as Array<keyof ConversionMetrics>).map((metric) => (
          <div
            key={metric}
            className={`bg-white rounded-xl border p-6 cursor-pointer transition-all hover:shadow-lg ${
              selectedMetric === metric ? 'border-blue-500 shadow-lg' : 'border-gray-200'
            }`}
            onClick={() => setSelectedMetric(metric)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${getPerformanceColor(data.current[metric], data.benchmark[metric], metric)} bg-opacity-10`}>
                  {getMetricIcon(metric)}
                </div>
                <h3 className="font-semibold text-gray-900">{getMetricLabel(metric)}</h3>
              </div>
              <Check className="w-5 h-5 text-green-500" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Nuvarande</span>
                <span className={`font-bold ${getPerformanceColor(data.current[metric], data.benchmark[metric], metric)}`}>
                  {formatMetricValue(metric, data.current[metric])}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Benchmark</span>
                <span className="font-medium text-gray-700">
                  {formatMetricValue(metric, data.benchmark[metric])}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Skillnad</span>
                <span className={`font-medium ${getPerformanceColor(data.current[metric], data.benchmark[metric], metric)}`}>
                  {metric === 'churnRate' || metric === 'timeToConversion' ? '-' : '+'}
                  {Math.abs((data.current[metric] - data.benchmark[metric]) / data.benchmark[metric] * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Improvements List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Rekommenderade Förbättringar</h2>
        
        <div className="space-y-4">
          {data.improvements.map((improvement, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                selectedMetric === improvement.metric ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getImpactColor(improvement.impact)}`}>
                    {improvement.impact === 'high' ? 'Hög prioritet' : improvement.impact === 'medium' ? 'Mellan' : 'Låg'}
                  </div>
                  <h3 className="font-semibold text-gray-900">{improvement.description}</h3>
                </div>
                {getMetricIcon(improvement.metric)}
              </div>
              
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Implementation:</h4>
                  <p className="text-sm text-gray-600">{improvement.implementation}</p>
                </div>
                
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">Nuvarande:</span>
                    <span className="text-sm font-medium">
                      {formatMetricValue(improvement.metric, data.current[improvement.metric])}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">Mål:</span>
                    <span className="text-sm font-medium text-green-600">
                      {improvement.metric === 'freeToProRate' ? '25%' :
                       improvement.metric === 'timeToConversion' ? '8 dagar' :
                       improvement.metric === 'activationRate' ? '85%' :
                       improvement.metric === 'churnRate' ? '4%' :
                       improvement.metric === 'proToPremiumRate' ? '15%' : '96%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Plan */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Implementeringsplan</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold text-sm">1</span>
              </div>
              <h3 className="font-semibold">Vecka 1-2</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Onboarding tour implementation</li>
              <li>• Usage-based prompts</li>
              <li>• Progress indicators</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold text-sm">2</span>
              </div>
              <h3 className="font-semibold">Vecka 3-4</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Feature limiting</li>
              <li>• Pro value demonstration</li>
              <li>• Early success metrics</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">3</span>
              </div>
              <h3 className="font-semibold">Vecka 5-6</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Retention emails</li>
              <li>• Usage analytics</li>
              <li>• Feedback loops</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-white rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Förväntad Effekt</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">+39%</div>
              <div className="text-sm text-gray-600">Free→Pro Konvertering</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">-43%</div>
              <div className="text-sm text-gray-600">Tid till Konvertering</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">+18%</div>
              <div className="text-sm text-gray-600">Aktiveringsgrad</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">-33%</div>
              <div className="text-sm text-gray-600">Churn Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
