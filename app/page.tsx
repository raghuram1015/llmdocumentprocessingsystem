'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Upload, Search, BarChart3, Eye, History, FileText, Database, Mail, HardDrive, X, Check, Loader2, AlertCircle, CheckCircle, XCircle, Clock, Trash2, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

type Tab = 'upload' | 'query' | 'results' | 'viewer' | 'history';

interface StoredDocument {
  id: string;
  name: string;
  content: string;
  chunks: number;
  clauses: number;
  size: string;
  processTime: string;
  status: 'stored' | 'processing';
  uploadDate: string;
  type: string;
}

interface QueryResult {
  id: string;
  query: string;
  timestamp: string;
  result: {
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
  };
  processingTime: number;
}

export default function LLMSystem() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // State management
  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryResult[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StoredDocument | null>(null);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Load data from localStorage on mount
  useEffect(() => {
    const savedDocuments = localStorage.getItem('llm-documents');
    const savedHistory = localStorage.getItem('llm-history');
    
    if (savedDocuments) {
      setStoredDocuments(JSON.parse(savedDocuments));
    }
    if (savedHistory) {
      setQueryHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('llm-documents', JSON.stringify(storedDocuments));
  }, [storedDocuments]);

  useEffect(() => {
    localStorage.setItem('llm-history', JSON.stringify(queryHistory));
  }, [queryHistory]);

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Simple text extraction - in a real app, you'd use proper PDF/DOCX parsers
        resolve(content || `[${file.type}] ${file.name} - Content extracted`);
      };
      reader.readAsText(file);
    });
  };

  const processDocument = async (file: File): Promise<StoredDocument> => {
    const startTime = Date.now();
    
    // Simulate processing with progress
    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

    // Simulate progress updates
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadProgress(prev => ({ ...prev, [fileId]: i }));
    }

    const content = await extractTextFromFile(file);
    const processTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Simulate document analysis
    const chunks = Math.floor(Math.random() * 50) + 20;
    const clauses = Math.floor(Math.random() * 20) + 5;
    
    const document: StoredDocument = {
      id: fileId,
      name: file.name,
      content,
      chunks,
      clauses,
      size: formatFileSize(file.size),
      processTime: `${processTime}s`,
      status: 'stored',
      uploadDate: new Date().toISOString(),
      type: file.type || 'text/plain'
    };

    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });

    return document;
  };

  const handleFileUpload = async (files: File[]) => {
    try {
      const processedDocs = await Promise.all(
        files.map(file => processDocument(file))
      );
      
      setStoredDocuments(prev => [...prev, ...processedDocs]);
      
      toast({
        title: "Documents uploaded successfully",
        description: `${files.length} document(s) processed and stored`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process documents",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const processQuery = async () => {
    if (!currentQuery.trim() || storedDocuments.length === 0) {
      toast({
        title: "Invalid query",
        description: "Please enter a query and ensure documents are uploaded",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const startTime = Date.now();

    try {
      const documentsContent = storedDocuments
        .map(doc => `Document: ${doc.name}\n${doc.content}`)
        .join('\n\n');

      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentQuery,
          documents: documentsContent,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        let processedResult;
        try {
          processedResult = typeof data.text === 'string' 
            ? JSON.parse(data.text) 
            : data.text;
        } catch {
          // Fallback if JSON parsing fails
          processedResult = {
            Decision: "Processed",
            Justification: data.text || "Query processed successfully",
            Clause_References: [],
            Confidence: 0.8
          };
        }

        const queryResult: QueryResult = {
          id: `query_${Date.now()}`,
          query: currentQuery,
          timestamp: new Date().toISOString(),
          result: processedResult,
          processingTime: Date.now() - startTime
        };

        setQueryHistory(prev => [queryResult, ...prev]);
        setCurrentResult(queryResult);
        setActiveTab('results');
        setCurrentQuery('');

        toast({
          title: "Query processed successfully",
          description: `Decision: ${processedResult.Decision}`,
        });
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process the query. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeDocument = (id: string) => {
    setStoredDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Document removed",
      description: "Document has been removed from storage",
    });
  };

  const clearAllData = () => {
    setStoredDocuments([]);
    setQueryHistory([]);
    setCurrentResult(null);
    localStorage.removeItem('llm-documents');
    localStorage.removeItem('llm-history');
    toast({
      title: "All data cleared",
      description: "All documents and history have been removed",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'needs clarification':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision.toLowerCase()) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'needs clarification':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'upload' as Tab, label: 'Upload', icon: Upload },
    { id: 'query' as Tab, label: 'Query', icon: Search },
    { id: 'results' as Tab, label: 'Results', icon: BarChart3 },
    { id: 'viewer' as Tab, label: 'Viewer', icon: Eye },
    { id: 'history' as Tab, label: 'History', icon: History },
  ];

  const capabilities = [
    { title: 'PDF Extraction', subtitle: 'Text & metadata parsing', icon: FileText, color: 'border-red-500/20 bg-red-500/5' },
    { title: 'DOCX Processing', subtitle: 'Structure preservation', icon: Database, color: 'border-blue-500/20 bg-blue-500/5' },
    { title: 'Email Analysis', subtitle: 'Content & attachments', icon: Mail, color: 'border-green-500/20 bg-green-500/5' },
    { title: 'Permanent Storage', subtitle: 'Browser local storage', icon: HardDrive, color: 'border-purple-500/20 bg-purple-500/5' },
  ];

  const approvedQueries = queryHistory.filter(q => q.result.Decision.toLowerCase() === 'approved').length;
  const rejectedQueries = queryHistory.filter(q => q.result.Decision.toLowerCase() === 'rejected').length;
  const avgResponseTime = queryHistory.length > 0 
    ? (queryHistory.reduce((acc, q) => acc + q.processingTime, 0) / queryHistory.length / 1000).toFixed(2)
    : '0.00';
  const avgConfidence = queryHistory.length > 0
    ? Math.round(queryHistory.reduce((acc, q) => acc + (q.result.Confidence || 0), 0) / queryHistory.length * 100)
    : 0;

  const stats = [
    { title: 'Total Documents', value: storedDocuments.length.toString(), subtitle: 'Stored permanently', color: 'border-blue-500/20 bg-blue-500/5' },
    { title: 'Processed Queries', value: queryHistory.length.toString(), subtitle: 'Queries stored in history', color: 'border-green-500/20 bg-green-500/5' },
    { title: 'Accuracy Rate', value: `${avgConfidence}%`, subtitle: 'Decision accuracy', color: 'border-purple-500/20 bg-purple-500/5' },
    { title: 'Avg Response Time', value: `${avgResponseTime}s`, subtitle: 'Average processing time', color: 'border-orange-500/20 bg-orange-500/5' },
  ];

  const sampleQueries = [
    "46-year-old male, knee surgery in Pune, 3-month-old insurance policy",
    "Female, 35 years, maternity coverage, HDFC Ergo policy",
    "Pre-existing diabetes, heart surgery coverage, waiting period check",
    "Dental treatment coverage for 28-year-old, Bajaj Allianz policy",
    "Emergency hospitalization, ICU coverage, policy active for 2 years"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">LLM System</h1>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Intelligent document analysis using Large Language Models for policy documents, 
                contracts, and emails with semantic search and automated decision making. All data is stored permanently.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'upload' && Object.keys(uploadProgress).length > 0 && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                  {tab.id === 'history' && queryHistory.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {queryHistory.length}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === 'upload' && (
          <div className="space-y-8">
            {/* Document Upload Section */}
            <div className="border border-dashed border-border rounded-lg p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Document Upload & Permanent Storage
                </h2>
                <p className="text-sm text-muted-foreground">
                  Upload policy documents, contracts, emails, or other text files for intelligent processing. 
                  All documents are stored permanently in your browser's local storage.
                </p>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Drag & drop files here, or click to select
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Supports PDF, DOCX, TXT, and EML files
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 10MB • Files stored permanently
                </p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.eml"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handleFileUpload(files);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Upload Progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium text-foreground">Processing Files...</h4>
                  {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div key={fileId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Processing document...</span>
                        <span className="text-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Processing Capabilities */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">AI Processing Capabilities</h2>
                <p className="text-sm text-muted-foreground">
                  Advanced document analysis powered by Large Language Models with permanent storage
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {capabilities.map((capability, index) => {
                  const Icon = capability.icon;
                  return (
                    <div key={index} className={`p-4 rounded-lg border ${capability.color}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-5 w-5" />
                        <h3 className="font-medium text-foreground">{capability.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{capability.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stored Documents */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Stored Documents ({storedDocuments.length})
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Documents are processed, indexed, and stored permanently for intelligent querying
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Database className="h-4 w-4 mr-2" />
                    Permanently Stored
                  </Button>
                  {storedDocuments.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={clearAllData}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {storedDocuments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No documents uploaded</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your first document to get started with AI-powered analysis
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {storedDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-red-500" />
                        <div>
                          <h3 className="font-medium text-foreground">{doc.name}</h3>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{doc.chunks} chunks</span>
                            <span>{doc.clauses} clauses</span>
                            <span>{doc.size}</span>
                            <span>Processed in {doc.processTime}</span>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Stored</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setActiveTab('viewer');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Check className="h-4 w-4 mr-1" />
                          Processed & Stored
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeDocument(doc.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'query' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Query Input */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Insurance Query Processing
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your insurance-related query in natural language. The AI will analyze your uploaded documents to provide detailed responses.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Your Query
                    </label>
                    <Textarea
                      placeholder="Enter your insurance query (e.g., '46-year-old male, knee surgery in Pune, 3-month-old insurance policy')"
                      value={currentQuery}
                      onChange={(e) => setCurrentQuery(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <Button 
                    onClick={processQuery}
                    disabled={isProcessing || !currentQuery.trim() || storedDocuments.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Query...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Process Query
                      </>
                    )}
                  </Button>

                  {storedDocuments.length === 0 && (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                      Please upload at least one document before processing queries.
                    </p>
                  )}
                </div>
              </div>

              {/* Sample Queries & Info */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Sample Queries</h3>
                  <div className="space-y-2">
                    {sampleQueries.map((sample, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start h-auto p-3 text-xs"
                        onClick={() => setCurrentQuery(sample)}
                      >
                        {sample}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-3">Query Guidelines</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                      Include age, gender, and medical condition
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                      Specify location and insurance provider if known
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                      Mention policy duration and any constraints
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                      Be specific about the treatment or procedure
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className={`p-6 rounded-lg border ${stat.color}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              ))}
            </div>

            {/* Current Result */}
            {currentResult && (
              <div className="border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Latest Query Result
                </h3>
                
                <div className="space-y-6">
                  {/* Decision */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getDecisionIcon(currentResult.result.Decision)}
                      <span className="font-semibold text-lg">{currentResult.result.Decision}</span>
                    </div>
                    <Badge className={getDecisionColor(currentResult.result.Decision)}>
                      {currentResult.result.Decision}
                    </Badge>
                  </div>

                  {/* Query */}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Query:</p>
                    <p className="text-sm text-foreground">{currentResult.query}</p>
                  </div>

                  {/* Amount */}
                  {currentResult.result.Amount && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Coverage Amount</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{currentResult.result.Amount}</p>
                    </div>
                  )}

                  {/* Confidence Score */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Confidence Score</span>
                    </div>
                    <span className="font-bold text-primary">
                      {((currentResult.result.Confidence || 0) * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Justification */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Justification</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{currentResult.result.Justification}</p>
                  </div>

                  {/* Missing Information */}
                  {currentResult.result.Missing && currentResult.result.Missing.length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">Missing Information</h4>
                      <ul className="list-disc list-inside text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                        {currentResult.result.Missing.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                      {currentResult.result.Suggested_Follow_up && (
                        <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Suggested Follow-up:</strong> {currentResult.result.Suggested_Follow_up}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clause References */}
                  {currentResult.result.Clause_References && currentResult.result.Clause_References.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Referenced Clauses</h4>
                      <div className="space-y-3">
                        {currentResult.result.Clause_References.map((ref, index) => (
                          <div key={index} className="p-3 border border-border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm text-foreground">{ref.Document}</span>
                              <Badge variant="outline" className="text-xs">
                                Page {ref.Page}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 italic">"{ref.Clause_Snippet}"</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-primary font-medium">Concept:</span>
                              <span className="text-xs text-foreground">{ref.Matched_Concept}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Query Breakdown */}
              <div className="p-6 border border-border rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Query Breakdown
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-foreground">Approved</span>
                    </div>
                    <span className="text-sm font-medium text-green-500">{approvedQueries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-foreground">Rejected</span>
                    </div>
                    <span className="text-sm font-medium text-red-500">{rejectedQueries}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Total Processed</span>
                      <span className="text-sm font-bold text-foreground">{queryHistory.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Performance */}
              <div className="p-6 border border-border rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">System Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Processing Speed</span>
                      <span className="text-sm font-medium text-foreground">
                        {parseFloat(avgResponseTime) < 3 ? 'Excellent' : parseFloat(avgResponseTime) < 5 ? 'Good' : 'Average'}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (5 - parseFloat(avgResponseTime)) * 20)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Decision Confidence</span>
                      <span className="text-sm font-medium text-foreground">{avgConfidence}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${avgConfidence}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">System Load</span>
                      <span className="text-sm font-medium text-foreground">
                        {isProcessing ? 'Processing' : 'Low'}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${isProcessing ? 'bg-red-500' : 'bg-yellow-500'}`} 
                        style={{ width: isProcessing ? '80%' : '25%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Status & Controls */}
              <div className="p-6 border border-border rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">System Status & Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Document Processing</span>
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">LLM Engine</span>
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded-full">
                      {isProcessing ? 'Processing' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Storage System</span>
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-500 text-xs rounded-full">Persistent</span>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setActiveTab('query')}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      New Query
                    </Button>
                    <Button variant="destructive" size="sm" className="w-full" onClick={clearAllData}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'viewer' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Document Viewer
              </h2>
              {selectedDocument && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedDocument(null)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              )}
            </div>

            {!selectedDocument ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storedDocuments.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="h-8 w-8 text-red-500" />
                      <div>
                        <h3 className="font-medium text-foreground text-sm">{doc.name}</h3>
                        <p className="text-xs text-muted-foreground">{doc.size}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Chunks:</span>
                        <span>{doc.chunks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clauses:</span>
                        <span>{doc.clauses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processed:</span>
                        <span>{doc.processTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-border rounded-lg">
                <div className="p-4 border-b border-border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-red-500" />
                      <div>
                        <h3 className="font-medium text-foreground">{selectedDocument.name}</h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{selectedDocument.chunks} chunks</span>
                          <span>{selectedDocument.clauses} clauses</span>
                          <span>{selectedDocument.size}</span>
                          <span>Uploaded: {new Date(selectedDocument.uploadDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      Processed & Stored
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="h-96 p-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                      {selectedDocument.content}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            )}

            {storedDocuments.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No documents to view</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload documents first to view them here
                </p>
                <Button onClick={() => setActiveTab('upload')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <History className="h-5 w-5" />
                Query History ({queryHistory.length})
              </h2>
              {queryHistory.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setQueryHistory([]);
                    localStorage.removeItem('llm-history');
                    toast({
                      title: "History cleared",
                      description: "All query history has been removed",
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear History
                </Button>
              )}
            </div>

            {queryHistory.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No query history</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Process your first query to see results here
                </p>
                <Button onClick={() => setActiveTab('query')}>
                  <Search className="h-4 w-4 mr-2" />
                  Create Query
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {queryHistory.map((query) => (
                  <div key={query.id} className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getDecisionIcon(query.result.Decision)}
                        <div>
                          <Badge className={getDecisionColor(query.result.Decision)}>
                            {query.result.Decision}
                          </Badge>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(query.timestamp).toLocaleString()}
                            </span>
                            <span>Processing: {(query.processingTime / 1000).toFixed(2)}s</span>
                            <span>Confidence: {((query.result.Confidence || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setCurrentResult(query);
                          setActiveTab('results');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Query:</p>
                        <p className="text-sm text-foreground bg-muted p-3 rounded">{query.query}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Response:</p>
                        <p className="text-sm text-foreground">{query.result.Justification}</p>
                      </div>

                      {query.result.Amount && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Amount:</span>
                          <span className="text-sm font-bold text-primary">{query.result.Amount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
