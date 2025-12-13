
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SharkIcon } from "@/components/ui/shark-icon";

// Historical trading examples data
const tradingExamples = [
  {
    id: 'example1',
    title: 'Growth Investment: Apple (2010-2020)',
    description: 'See how a long-term investment in Apple would have performed over a decade.',
    type: 'growth',
    data: [
      { date: '2010', price: 36.32 },
      { date: '2011', price: 58.27 },
      { date: '2012', price: 76.02 },
      { date: '2013', price: 80.15 },
      { date: '2014', price: 110.38 },
      { date: '2015', price: 105.26 },
      { date: '2016', price: 115.82 },
      { date: '2017', price: 169.23 },
      { date: '2018', price: 157.74 },
      { date: '2019', price: 293.65 },
      { date: '2020', price: 132.69 }
    ],
    initialInvestment: 10000,
    finalValue: 36533,
    annualReturn: '13.8%',
    lessons: [
      'Long-term investing can ride out short-term volatility',
      'Companies with strong innovation often outperform the market',
      'Even established companies can experience significant growth'
    ],
    goodDecisions: [
      'Holding through market dips in 2013 and 2016',
      'Not selling after the strong performance in 2017'
    ],
    badDecisions: [
      'Not buying more during the 2016 dip'
    ]
  },
  {
    id: 'example2',
    title: 'Market Crash: S&P 500 (2008-2010)',
    description: 'Learn how markets recover after major crashes through the 2008 financial crisis.',
    type: 'recovery',
    data: [
      { date: 'Jan 2008', price: 1378.55 },
      { date: 'Apr 2008', price: 1385.59 },
      { date: 'Jul 2008', price: 1267.38 },
      { date: 'Oct 2008', price: 968.75 },
      { date: 'Jan 2009', price: 825.88 },
      { date: 'Apr 2009', price: 872.81 },
      { date: 'Jul 2009', price: 987.48 },
      { date: 'Oct 2009', price: 1036.19 },
      { date: 'Jan 2010', price: 1073.87 },
      { date: 'Apr 2010', price: 1186.69 },
      { date: 'Jul 2010', price: 1101.60 },
      { date: 'Dec 2010', price: 1257.64 }
    ],
    initialInvestment: 10000,
    finalValue: 9123,
    annualReturn: '-3.1%',
    lessons: [
      'Market crashes are painful but temporary',
      'Panic selling often leads to missing the recovery',
      'Dollar-cost averaging can be effective during downturns'
    ],
    goodDecisions: [
      'Continuing to invest through the downturn',
      'Not selling at the bottom in early 2009'
    ],
    badDecisions: [
      'Investing all money at once before the crash',
      'Letting emotions drive selling decisions'
    ]
  },
  {
    id: 'example3',
    title: 'Dividend Strategy: Coca-Cola (2000-2020)',
    description: 'Explore how dividend reinvestment compounds returns over time.',
    type: 'income',
    data: [
      { date: '2000', price: 29.37, dividend: 0.68 },
      { date: '2005', price: 20.82, dividend: 1.12 },
      { date: '2010', price: 32.92, dividend: 1.76 },
      { date: '2015', price: 42.96, dividend: 1.32 },
      { date: '2020', price: 54.84, dividend: 1.64 }
    ],
    initialInvestment: 10000,
    finalValue: 39875,
    annualReturn: '7.2%',
    lessons: [
      'Dividend stocks can provide income plus growth',
      'Reinvesting dividends significantly increases total returns',
      'Companies with consistent dividend increases often have stable businesses'
    ],
    goodDecisions: [
      'Reinvesting all dividends rather than taking income',
      'Holding during flat price periods due to dividend income'
    ],
    badDecisions: [
      'Not allocating more to dividend stocks during high interest rate periods'
    ]
  }
];

const TradingExamplesPage = () => {
  const [selectedExample, setSelectedExample] = useState(tradingExamples[0].id);
  const [filter, setFilter] = useState('all');
  
  const filteredExamples = filter === 'all' 
    ? tradingExamples 
    : tradingExamples.filter(example => example.type === filter);
    
  const currentExample = tradingExamples.find(ex => ex.id === selectedExample) || tradingExamples[0];
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Historical Trading Examples</h1>
        <p className="text-muted-foreground">Learn from real market scenarios without risking money</p>
      </div>
      
      {/* Main Content */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Examples List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Trading Scenarios</CardTitle>
                <CardDescription>Select an example to analyze</CardDescription>
              </div>
              
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Examples</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="recovery">Recovery</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredExamples.map(example => (
              <div
                key={example.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  example.id === selectedExample 
                    ? 'bg-finance-light/20 border-finance' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedExample(example.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{example.title}</h3>
                  <Badge variant={
                    example.type === 'growth' ? 'default' :
                    example.type === 'recovery' ? 'destructive' : 'outline'
                  }>
                    {example.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{example.description}</p>
              </div>
            ))}
            
            {filteredExamples.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No examples match the selected filter.</p>
                <Button variant="outline" className="mt-4" onClick={() => setFilter('all')}>
                  Show all examples
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Example Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{currentExample.title}</CardTitle>
            <CardDescription>{currentExample.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Performance Chart */}
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={currentExample.data}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#16a34a" 
                    activeDot={{ r: 8 }} 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Initial Investment</p>
                      <h3 className="text-xl font-semibold">${currentExample.initialInvestment.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 rounded-full bg-finance-light/30">
                      <Calendar className="h-5 w-5 text-finance" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Final Value</p>
                      <h3 className="text-xl font-semibold">${currentExample.finalValue.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 rounded-full bg-finance-light/30">
                      {currentExample.finalValue >= currentExample.initialInvestment ? (
                        <TrendingUp className="h-5 w-5 text-finance" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-finance-danger" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Annual Return</p>
                      <h3 className={`text-xl font-semibold ${
                        currentExample.annualReturn.includes('-') ? 'text-finance-danger' : 'text-finance-success'
                      }`}>
                        {currentExample.annualReturn}
                      </h3>
                    </div>
                    <div className="p-3 rounded-full bg-finance-light/30">
                      {currentExample.annualReturn.includes('-') ? (
                        <TrendingDown className="h-5 w-5 text-finance-danger" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-finance-success" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Analysis Tabs */}
            <Tabs defaultValue="lessons">
              <TabsList className="mb-4">
                <TabsTrigger value="lessons">Key Lessons</TabsTrigger>
                <TabsTrigger value="decisions">Trading Decisions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="lessons" className="space-y-4 mt-0">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Key Takeaways</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-2">
                      {currentExample.lessons.map((lesson, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-finance-success mt-1 flex-shrink-0" />
                          <span>{lesson}</span>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center gap-4 p-4 rounded-lg bg-finance-light/20">
                  <SharkIcon className="h-10 w-10 text-finance flex-shrink-0" />
                  <div>
                    <h3 className="font-medium">Finny's Advice</h3>
                    <p className="text-sm text-muted-foreground">
                      Practice makes perfect! After analyzing this example, try to spot similar patterns in current market conditions.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="decisions" className="space-y-4 mt-0">
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-finance-success" />
                    Good Decisions
                  </h3>
                  <ul className="space-y-2">
                    {currentExample.goodDecisions.map((decision, i) => (
                      <li key={i} className="text-sm border-l-2 border-finance-success pl-3 py-1">
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-finance-danger" />
                    Mistakes to Avoid
                  </h3>
                  <ul className="space-y-2">
                    {currentExample.badDecisions.map((decision, i) => (
                      <li key={i} className="text-sm border-l-2 border-finance-danger pl-3 py-1">
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Alert className="bg-muted/50 border-dashed">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <AlertTitle className="text-sm font-medium">Hindsight is 20/20</AlertTitle>
                  <AlertDescription className="text-xs">
                    Remember that these decisions are obvious in retrospect. In real-time trading, emotions and uncertainty make decisions much harder.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Learning resources section */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Fundamentals</CardTitle>
          <CardDescription>Learn the basics before diving into real trading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-finance">
              <h4 className="font-medium mb-1">Technical Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Learn to read charts, identify patterns, and use indicators to inform trading decisions.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-finance">
              <h4 className="font-medium mb-1">Fundamental Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Evaluate companies based on financial statements, management, competitive advantages, and industry trends.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-finance">
              <h4 className="font-medium mb-1">Risk Management</h4>
              <p className="text-sm text-muted-foreground">
                Learn position sizing, setting stop-losses, and diversification to protect your investments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingExamplesPage;
