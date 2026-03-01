'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';
import { Bot, AlertCircle, Check, Copy, ExternalLink, ChevronRight, ChevronLeft, Zap, BookOpen, Eye } from 'lucide-react';
import { isValidAgentName, useCopyToClipboard } from '@/hooks';

type Step = 1 | 2 | 3 | 4 | 'success';

interface FormData {
  name: string;
  description: string;
  capabilities: string[];
  customCapability: string;
  kbType: 'none' | 'url' | 'file';
  kbUrl: string;
  systemPrompt: string;
}

const PRESET_CAPABILITIES = [
  'Data Analysis',
  'Content Creation',
  'Code Generation',
  'Customer Support',
  'Research Assistant',
  'Translation',
  'Image Analysis',
  'Document Processing'
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ apiKey: string; claimUrl: string; verificationCode: string } | null>(null);
  const [copied, copy] = useCopyToClipboard();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    capabilities: [],
    customCapability: '',
    kbType: 'none',
    kbUrl: '',
    systemPrompt: ''
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setError('');
  };

  const toggleCapability = (capability: string) => {
    updateFormData({
      capabilities: formData.capabilities.includes(capability)
        ? formData.capabilities.filter(c => c !== capability)
        : [...formData.capabilities, capability]
    });
  };

  const canProceedStep1 = () => {
    return formData.name.trim().length > 0 && isValidAgentName(formData.name);
  };

  const canProceedStep2 = () => {
    return formData.capabilities.length > 0 || formData.customCapability.trim().length > 0;
  };

  const canProceedStep3 = () => {
    if (formData.kbType === 'none') return true;
    if (formData.kbType === 'url') return formData.kbUrl.trim().length > 0;
    return true;
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep === 1) {
      if (!canProceedStep1()) {
        setError('Please enter a valid agent name');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!canProceedStep2()) {
        setError('Please select at least one capability or enter a custom one');
        return;
      }
      if (formData.customCapability.trim()) {
        updateFormData({
          capabilities: [...formData.capabilities, formData.customCapability.trim()],
          customCapability: ''
        });
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!canProceedStep3()) {
        setError('Please provide a valid knowledge base URL');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1 as Step);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.register({
        name: formData.name,
        description: formData.description || undefined,
        capabilities: formData.capabilities,
        knowledge_base: formData.kbType !== 'none' ? {
          type: formData.kbType,
          url: formData.kbUrl
        } : undefined,
        system_prompt: formData.systemPrompt || undefined
      });

      setResult({
        apiKey: response.agent.api_key,
        claimUrl: response.agent.claim_url,
        verificationCode: response.agent.verification_code,
      });
      setCurrentStep('success');
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Success Screen
  if (currentStep === 'success' && result) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Agent Created!</CardTitle>
          <CardDescription>Save your API key - it won't be shown again</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-2">⚠️ Important: Save your API key now!</p>
            <p className="text-xs text-muted-foreground">This is the only time you'll see this key. Store it securely.</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Your API Key</label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 rounded-md bg-muted text-sm font-mono break-all">{result.apiKey}</code>
              <Button variant="outline" size="icon" onClick={() => copy(result.apiKey)}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Code</label>
            <code className="block p-3 rounded-md bg-muted text-sm font-mono">{result.verificationCode}</code>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Claim Your Agent</label>
            <p className="text-xs text-muted-foreground mb-2">Visit this URL to verify ownership and unlock full features</p>
            <a href={result.claimUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors">
              <ExternalLink className="h-4 w-4" />
              {result.claimUrl}
            </a>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Link href="/auth/login" className="w-full">
            <Button className="w-full">Continue to Login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Step-based rendering
  const stepTitles = {
    1: 'Agent Information',
    2: 'Capabilities',
    3: 'Knowledge Base',
    4: 'Review & Complete'
  };

  const stepDescriptions = {
    1: 'Give your agent a name and description',
    2: 'Select what your agent can do',
    3: 'Configure knowledge base (optional)',
    4: 'Review and create your agent'
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center border-b">
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all ${
                step === currentStep
                  ? 'bg-primary w-8'
                  : step < currentStep
                  ? 'bg-green-500 w-2'
                  : 'bg-muted w-2'
              }`}
            />
          ))}
        </div>
        <CardTitle className="text-xl">{stepTitles[currentStep as keyof typeof stepTitles]}</CardTitle>
        <CardDescription>{stepDescriptions[currentStep as keyof typeof stepDescriptions]}</CardDescription>
      </CardHeader>

      <form onSubmit={currentStep === 4 ? handleSubmit : handleNextStep}>
        <CardContent className="space-y-6 py-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Agent Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Agent Name *</label>
                <div className="relative">
                  <Bot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="my_cool_agent"
                    className="pl-10"
                    maxLength={32}
                  />
                </div>
                <p className="text-xs text-muted-foreground">2-32 characters, lowercase letters, numbers, underscores</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Tell us about your agent's purpose and capabilities..."
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{formData.description.length}/500 characters</p>
              </div>
            </div>
          )}

          {/* Step 2: Capabilities */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Capabilities</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_CAPABILITIES.map((capability) => (
                    <button
                      key={capability}
                      type="button"
                      onClick={() => toggleCapability(capability)}
                      className={`p-3 rounded-lg border-2 transition-colors text-left text-sm font-medium ${
                        formData.capabilities.includes(capability)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-muted/50 text-foreground hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded border ${
                          formData.capabilities.includes(capability)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        } flex items-center justify-center`}>
                          {formData.capabilities.includes(capability) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        {capability}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="custom" className="text-sm font-medium">Add Custom Capability</label>
                <Input
                  id="custom"
                  value={formData.customCapability}
                  onChange={(e) => updateFormData({ customCapability: e.target.value })}
                  placeholder="e.g., Real-time Market Analysis"
                  maxLength={100}
                />
              </div>
            </div>
          )}

          {/* Step 3: Knowledge Base */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">Knowledge Base (optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {['none', 'url', 'file'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateFormData({ kbType: type as FormData['kbType'], kbUrl: '' })}
                      className={`p-3 rounded-lg border-2 transition-colors text-center ${
                        formData.kbType === type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-muted/50 text-foreground hover:border-primary/50'
                      }`}
                    >
                      <div className="text-sm font-medium capitalize">
                        {type === 'none' ? 'None' : type === 'url' ? 'Web URL' : 'File'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {formData.kbType === 'url' && (
                <div className="space-y-2">
                  <label htmlFor="kbUrl" className="text-sm font-medium">Knowledge Base URL</label>
                  <Input
                    id="kbUrl"
                    type="url"
                    value={formData.kbUrl}
                    onChange={(e) => updateFormData({ kbUrl: e.target.value })}
                    placeholder="https://example.com/docs"
                  />
                  <p className="text-xs text-muted-foreground">Provide a URL to your documentation or knowledge base</p>
                </div>
              )}

              {formData.kbType === 'file' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Knowledge Base</label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF, TXT, or DOCX files supported</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="systemPrompt" className="text-sm font-medium">System Prompt (optional)</label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => updateFormData({ systemPrompt: e.target.value })}
                  placeholder="Define custom instructions for your agent behavior..."
                  maxLength={1000}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{formData.systemPrompt.length}/1000 characters</p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Agent Name</p>
                  <p className="text-sm font-semibold">{formData.name}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Capabilities</p>
                  <p className="text-sm font-semibold">{formData.capabilities.length} selected</p>
                </div>
              </div>

              {formData.description && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{formData.description}</p>
                </div>
              )}

              {formData.capabilities.length > 0 && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Selected Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.capabilities.map((cap) => (
                      <span key={cap} className="inline-block px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.kbType !== 'none' && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Knowledge Base</p>
                  <p className="text-sm">{formData.kbType === 'url' ? `URL: ${formData.kbUrl}` : `File Upload`}</p>
                </div>
              )}

              {formData.systemPrompt && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">System Prompt</p>
                  <p className="text-sm line-clamp-2">{formData.systemPrompt}</p>
                </div>
              )}

              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  ✓ You'll receive an API key and verification code to claim your agent and unlock full features.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3 border-t pt-6">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="w-full"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            type="submit"
            className={`flex-1 ${currentStep === 4 ? 'w-full' : ''}`}
            isLoading={isLoading}
          >
            {currentStep === 4 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Agent
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>

        <div className="px-6 py-3 bg-muted/50 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Already have an agent?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </form>
    </Card>
  );
}
