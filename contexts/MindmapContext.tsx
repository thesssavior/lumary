"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Node, Edge } from 'reactflow';

// Define the shape of the context state
interface MindmapState {
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  error: string | null;
  isGenerated: boolean;
  isSaving: boolean; // For save status
  saveError: string | null; // For save error
}

// Define the actions available in the context
interface MindmapActions {
  generateMindmap: (summaryText: string, locale: string, summaryId?: string) => Promise<void>; // summaryId is optional
  clearMindmap: () => void;
  setInitialData: (nodes: Node[], edges: Edge[]) => void;
  // saveMindmap?: (summaryId: string, nodes: Node[], edges: Edge[]) => Promise<void>; // Direct save might be less used if generateMindmap handles it
}

// Combine state and actions for the context type
interface MindmapContextType extends MindmapState, MindmapActions {}

// Create the context
const MindmapContext = createContext<MindmapContextType | undefined>(undefined);

// Define props for the provider
interface MindmapProviderProps {
  children: ReactNode;
  // summaryId can be passed for contexts that need to save (e.g., on summary detail page)
  // For /new page, this would be undefined.
  // currentSummaryId?: string; 
}

// Create the provider component
export const MindmapProvider: React.FC<MindmapProviderProps> = ({ children }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const clearMindmap = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setIsLoading(false);
    setError(null);
    setIsGenerated(false);
    setIsSaving(false);
    setSaveError(null);
  }, []);

  const setInitialData = useCallback((initialNodes: Node[], initialEdges: Edge[]) => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsGenerated(initialNodes.length > 0 || initialEdges.length > 0);
    setIsLoading(false);
    setError(null);
    setIsSaving(false); 
    setSaveError(null);
  }, []);

  const saveMindmapInternal = async (summaryId: string, nodesToSave: Node[], edgesToSave: Edge[]) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`/api/summaries/${summaryId}/mindmap`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: nodesToSave, edges: edgesToSave }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save mindmap data');
      }
      console.log("Mindmap saved successfully for summaryId:", summaryId);
      // Optionally, show a success message to the user via another state variable
    } catch (err: any) {
      console.error("Error saving mindmap:", err);
      setSaveError(err.message || 'An unknown error occurred while saving the mindmap.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateMindmap = useCallback(async (summaryText: string, locale: string, summaryIdToSave?: string) => {
    if (!summaryText) {
      setError("Summary text is required to generate a mind map.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsGenerated(false); // Reset generated status before fetching

    try {
      const response = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryText, locale }),
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
          }));
        setNodes(validatedNodes);
        setEdges(data.edges);
        setIsGenerated(true);

        // If summaryIdToSave is provided, save the newly generated mindmap
        if (summaryIdToSave) {
          await saveMindmapInternal(summaryIdToSave, validatedNodes, data.edges);
        }
      } else {
        setNodes([]); // Clear nodes if data is invalid
        setEdges([]); // Clear edges
        throw new Error('Invalid data structure received from mindmap API');
      }
    } catch (err: any) {
      console.error("Error generating mindmap:", err);
      setError(err.message || 'An unknown error occurred while generating the mindmap.');
      setNodes([]); // Ensure nodes/edges are cleared on error
      setEdges([]);
      setIsGenerated(false); 
    } finally {
      setIsLoading(false);
    }
  }, []); 

  return (
    <MindmapContext.Provider 
      value={{
        nodes,
        edges,
        isLoading,
        error,
        isGenerated,
        isSaving,      // Provide save status
        saveError,     // Provide save error
        generateMindmap,
        clearMindmap,
        setInitialData,
      }}
    >
      {children}
    </MindmapContext.Provider>
  );
};

// Custom hook to use the Mindmap context
export const useMindmap = (): MindmapContextType => {
  const context = useContext(MindmapContext);
  if (context === undefined) {
    throw new Error('useMindmap must be used within a MindmapProvider');
  }
  return context;
}; 