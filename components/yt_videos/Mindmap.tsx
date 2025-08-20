"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Loader2, AlertTriangle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';

// No custom nodeTypes or edgeTypes needed - removing empty objects to prevent React Flow warnings

interface MindmapProps {
  summary?: string;
  chapters?: { title: string; summary: string }[];
  mindmap: any | null;
  locale: string;
  contentLanguage?: string; // Content language for mindmap generation
  summaryId: string | null | undefined;
  isActive: boolean | null;
  isStreaming?: boolean;
  layout?: 'default' | 'split';
}

const MindmapComponent: React.FC<MindmapProps> = ({ summary, mindmap, locale, contentLanguage, summaryId, isActive, isStreaming = false, chapters, layout = 'default' }) => {
  const t = useTranslations();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reactFlowReady, setReactFlowReady] = useState(false);
  const { fitView } = useReactFlow();
  const hasFit = useRef(false);
  const { data: session } = useSession();

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    if (mindmap) {
      if (mindmap.nodes && Array.isArray(mindmap.nodes) && mindmap.nodes.length > 0) {
        setNodes(mindmap.nodes);
        setEdges(mindmap.edges || []);
        setIsGenerated(true);
      }
    }
  }, [mindmap]);
  
  // fitView runs after reactflow mounts and states are updated
  useEffect(() => {
    if (reactFlowReady && nodes.length && !hasFit.current && isActive) {
      requestAnimationFrame(() => {
        fitView();
      });
      hasFit.current = true;
    }
  }, [reactFlowReady, nodes]);
  

  const generateMindmap = async () => {
    const content = chapters && chapters.length > 0
      ? chapters.map(c => `${c.title}\n${c.summary}`).join('\n\n')
      : summary;

    if (!content) {
      setError("No summary or chapters provided to generate mind map.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/summaries/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryText: content, locale: locale, contentLanguage: contentLanguage }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch mindmap data');
      }

      const data = await response.json();
      if (data.nodes && data.edges) {
        const validatedNodes = data.nodes.map((node: Node) => ({
          ...node,
          position: node.position || { x: Math.random() * 400, y: Math.random() * 400 },
          sourcePosition: node.sourcePosition || Position.Right,
          targetPosition: node.targetPosition || Position.Left,
        }));
        setNodes(validatedNodes);
        setEdges(data.edges);
        setIsGenerated(true);
        setIsLoading(false);

        // Save only when the user is logged in and we have a valid summaryId
        if (!session) {
          setIsSaving(false);
          return;
        }

        // Only save if we have a valid summaryId (not "new" or undefined)
        if (!summaryId || summaryId === 'new') {
          console.log("Mindmap generated but not saved - no valid summaryId yet");
          setIsSaving(false);
          return;
        }

        // Save the mindmap to the database
        setIsSaving(true);

        try {
          const saveResponse = await fetch('/api/summaries/mindmap', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summaryId, mindmap: { nodes: validatedNodes, edges: data.edges } }),
          });

          if (!saveResponse.ok) {
            const saveErrData = await saveResponse.json();
            console.error("Failed to save mindmap:", saveErrData.error || 'Failed to save mindmap to database');
            setError(saveErrData.error || 'Failed to save mindmap to database');
          } else {
            console.log("Mindmap saved successfully");
          }
        } finally {
          setIsSaving(false);
        }

      } else {
        throw new Error('Invalid data structure received from mindmap API');
      }
    } catch (err: any) {
      console.error("Error fetching mindmap data:", err);
      setError(err.message || 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  const hasContent = summary || (chapters && chapters.length > 0);

  if (!hasContent) {
    return (
      <div className="h-full w-full flex items-center justify-center border rounded-md">
        <p className="text-gray-500">{t('Mindmap.noSummaryAvailable')}</p>
      </div>
    );
  }

  if (!isGenerated && !isLoading && !error && !isSaving && !isStreaming) {
    return (
      <div className={`flex flex-col items-center justify-center h-full min-h-[300px] p-10 text-center rounded-md ${layout === 'split' ? 'mt-[-20%]' : ''}`}>
        <Brain className="h-12 w-12 mb-6" />
        <h3 className="text-xl font-semibold mb-2">{t('Mindmap.title')}</h3>
        <p className="text-sm text-gray-500 text-center max-w-md mb-6">
          {t('Mindmap.generateMindmapDescription')}
        </p>
        <Button 
          onClick={generateMindmap}
          size="lg"
          disabled={!hasContent}
        >
          {t('Mindmap.generateMindmapButton')}
        </Button>
      </div>
    );
  }

  // Show loading state when streaming
  if (isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-10 text-center rounded-md">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <h3 className="text-xl font-semibold mb-2">Summary in Progress</h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Please wait for the summary to complete before generating the mind map.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-md mt-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || (nodes.length === 0 && !isLoading && !isSaving)) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center rounded-md p-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-600">Error Generating Mind Map</h3>
        <p className="text-sm text-red-500 text-center">{error}</p>
        <Button 
          onClick={generateMindmap}
          className="mt-4"
          variant="outline"
          disabled={!hasContent}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[500px]">
      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={() => setReactFlowReady(true)}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
};
const Mindmap: React.FC<MindmapProps> = (props) => (
  <ReactFlowProvider>
    <MindmapComponent {...props} />
  </ReactFlowProvider>
);

export default Mindmap;
