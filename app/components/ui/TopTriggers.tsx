"use client";
import React, { useEffect } from "react";
import { Lightbulb, TrendingUp } from "lucide-react";
import { Progress } from "@/app/components/ui/progress";
import "app/styles/GoogleAnalytics.css";
// Import the hooks and types from the previous API implementation
import { useGoogleSearchStore, Trigger } from "@/app/api/top10triggers"; // Adjust import path as needed

interface MarketingTriggersProps {
  query: string;
}

const LoadingSpinner = () => (
  <div className="analytics-loader">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="analytics-loader__item" />
    ))}
  </div>
);

const MarketingTriggers: React.FC<MarketingTriggersProps> = ({ query }) => {
  const { 
    generateTopTriggers, 
    triggersData, 
    isLoading, 
    error 
  } = useGoogleSearchStore();

  useEffect(() => {
    if (query.trim()) {
      generateTopTriggers(query);
    }
  }, [query]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Lightbulb className="mr-2 text-yellow-500" size={24} />
          Top Triggers
        </h2>
        <p className="text-gray-600 mb-6">Marketing Insights for: {query}</p>
      </header>

      <div className="analytics-grid">
        {triggersData?.triggers.map((trigger, index) => (
          <div 
            key={index} 
            className="analytics-card glass-card"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              height: '100%'
            }}
          >
            <div>
              <div className="flex items-center mb-2">
                <TrendingUp className="mr-2 text-blue-500" size={20} />
                <h3 className="text-lg font-semibold">{trigger.heading}</h3>
              </div>
              <p className="text-gray-600">{trigger.description}</p>
            </div>
            <div className="analytics-progress-container mt-3">
              <Progress 
                value={Math.floor(Math.random() * 100)} 
                className="custom-progress" 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketingTriggers;
