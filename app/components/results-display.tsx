'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, FileText, TrendingUp } from 'lucide-react';

interface ProcessingResult {
  Decision: string;
  Amount?: string;
  Justification: string;
  Clause_References: Array<{
    Document: string;
    Clause_Snippet: string;
    Page: string;
    Matched_Concept: string;
  }>;
  Confidence: number;
  Missing?: string[];
  Suggested_Follow_up?: string;
}

interface ResultsDisplayProps {
  result: ProcessingResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const getDecisionIcon = (decision: string) => {
    switch (decision.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'needs clarification':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'needs clarification':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Processing Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Decision */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getDecisionIcon(result.Decision)}
            <span className="font-semibold text-lg">{result.Decision}</span>
          </div>
          <Badge className={getDecisionColor(result.Decision)}>
            {result.Decision}
          </Badge>
        </div>

        {/* Amount */}
        {result.Amount && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Coverage Amount</p>
            <p className="text-lg font-bold text-blue-700">{result.Amount}</p>
          </div>
        )}

        {/* Confidence Score */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Confidence Score</span>
          </div>
          <span className={`font-bold ${getConfidenceColor(result.Confidence)}`}>
            {(result.Confidence * 100).toFixed(1)}%
          </span>
        </div>

        {/* Justification */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Justification</h4>
          <p className="text-gray-700 text-sm leading-relaxed">{result.Justification}</p>
        </div>

        {/* Missing Information */}
        {result.Missing && result.Missing.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Missing Information</h4>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
              {result.Missing.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            {result.Suggested_Follow_up && (
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Suggested Follow-up:</strong> {result.Suggested_Follow_up}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Clause References */}
        {result.Clause_References && result.Clause_References.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Referenced Clauses</h4>
            <div className="space-y-3">
              {result.Clause_References.map((ref, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-900">{ref.Document}</span>
                    <Badge variant="outline" className="text-xs">
                      Page {ref.Page}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 italic">"{ref.Clause_Snippet}"</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600 font-medium">Concept:</span>
                    <span className="text-xs text-gray-700">{ref.Matched_Concept}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
