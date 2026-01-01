import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { Cell, CellType, GeneralCellProps } from '../types';
import CodeCell from './CodeCell';

// --- Begin Expanded Universe ---

// --- 1. Expanded Types and Interfaces ---

// Extending the existing CellType for new cell capabilities
export enum ExpandedCellType {
    Code = 'code',
    Markdown = 'markdown',
    Data = 'data', // For displaying dataframes, tables
    Visualization = 'visualization', // For charts, graphs
    AIChat = 'ai_chat', // For interactive AI conversations
    SQL = 'sql', // For SQL queries against linked databases
    Drawing = 'drawing', // For collaborative whiteboarding
    Form = 'form', // For interactive user input forms
    WebComponent = 'web_component', // For embedding custom interactive web components
    FileBrowser = 'file_browser', // For embedding a file browser
    Terminal = 'terminal', // For an embedded terminal
    Embed = 'embed', // For embedding external content (YouTube, Figma, etc.)
    Timeline = 'timeline', // For project timelines or historical data
    Map = 'map', // For geographical data visualization
    Audio = 'audio', // For audio playback and analysis
    Video = 'video', // For video playback and annotation
}

export interface EnhancedCell extends Cell {
    type: ExpandedCellType; 
    content: any;
    outputs?: any[];
    executionCount?: number;
    status?: 'idle' | 'running' | 'error' | 'success' | 'queued';
    language?: string;
    metadata?: {
        collapsed?: boolean;
        hideCode?: boolean;
        hideOutput?: boolean;
        readOnly?: boolean;
        tags?: string[];
        kernel?: string;
        [key: string]: any;
    };
    comments?: CellComment[];
    collaborators?: { id: string; cursor?: { start: number; end: number; }; }[];
    executionTime?: { start: string; end: string; durationMs: number; };
    author?: string;
    visibility?: 'public' | 'private' | 'restricted' | 'team';
    lastModified?: string;
    createdAt?: string;
}

export interface CellVersion {
    timestamp: string;
    author: string;
    content: any;
    metadata?: Record<string, any>;
    diff?: any;
    message?: string;
}

export interface CellComment {
    id: string;
    author: string;
    timestamp: string;
    text: string;
    resolved?: boolean;
    replies?: CellComment[];
}

export interface UserProfile {
    id: string;
    name: string;
    avatarUrl: string;
    status: 'online' | 'offline' | 'typing' | 'away';
    permissions?: 'viewer' | 'editor' | 'admin';
}

export interface NotebookMetadata {
    id: string;
    title: string;
    description: string;
    author: string;
    createdAt: string;
    lastModified: string;
    visibility: 'public' | 'private' | 'restricted' | 'team';
    sharedWith: { userId: string; permissions: 'viewer' | 'editor' | 'admin'; }[];
    kernels: KernelInfo[];
    defaultKernelId: string;
    theme: string;
    settings: Record<string, any>;
    plugins?: { [pluginId: string]: { enabled: boolean; config: any; }; };
    version?: number;
    resourceLimits?: { cpu: number; memory: number; gpu: number; runtime: number; };
    deploymentTargets?: { id: string; name: string; type: 'web_app' | 'api' | 'data_pipeline'; }[];
    integrations?: { [service: string]: { enabled: boolean; config: any; }; };
}

export interface KernelInfo {
    id: string;
    name: string;
    language: string;
    status: 'idle' | 'busy' | 'restarting' | 'disconnected' | 'starting';
    version?: string;
    capabilities?: string[];
    supportedCellTypes?: ExpandedCellType[];
}

export interface Notification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'system' | 'collaborator';
    message: string;
    timestamp: string;
    read: boolean;
    source?: string;
}

export interface Command {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    handler: (context?: any) => void;
    category?: string;
    visible?: (context?: any) => boolean;
}

// --- 2. Contexts for Global State and Actions ---

export interface NotebookContextType {
    notebookId: string;
    cells: EnhancedCell[];
    activeCellId: string | null;
    setActiveCellId: (id: string | null) => void;
    notebookMetadata: NotebookMetadata;
    setNotebookMetadata: React.Dispatch<React.SetStateAction<NotebookMetadata>>;
    users: UserProfile[];
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    executeCell: (cellId: string) => Promise<any>;
    updateCell: (cellId: string, updates: Partial<EnhancedCell>, pushToHistory?: boolean) => void;
    addCell: (type: ExpandedCellType, content: any, index?: number, metadata?: Record<string, any>) => void;
    deleteCell: (cellId: string) => void;
    moveCell: (fromIndex: number, toIndex: number) => void;
    runAllCells: () => Promise<void>;
    undo: () => void;
    redo: () => void;
    commandPaletteOpen: boolean;
    setCommandPaletteOpen: (open: boolean) => void;
    aiAssistantOpen: boolean;
    setAiAssistantOpen: (open: boolean) => void;
    globalSearchTerm: string;
    setGlobalSearchTerm: (term: string) => void;
    saveNotebook: () => Promise<void>;
    loadNotebook: (notebookId: string) => Promise<void>;
    toggleSidebarPanel: (panel: 'outline' | 'variables' | 'files' | 'plugins') => void;
    activeSidebarPanel: 'outline' | 'variables' | 'files' | 'plugins';
}

export const NotebookContext = createContext<NotebookContextType | undefined>(undefined);

export const useNotebook = () => {
    const context = useContext(NotebookContext);
    if (!context) {
        throw new Error('useNotebook must be used within a NotebookProvider');
    }
    return context;
};

// --- 3. Helper Functions and Utilities ---

export const generateUniqueId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const debounce = (func: Function, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function (...args: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export const applyTheme = (themeName: string) => {
    document.documentElement.setAttribute('data-theme', themeName);
    // document.body.className = `theme-${themeName} bg-gray-900 text-white min-h-screen font-sans`; 
};

export const getAvailableKernels = (): KernelInfo[] => {
    return [
        { id: 'python-3.10', name: 'Python 3.10', language: 'python', status: 'idle', version: '3.10.6', capabilities: ['dataframe', 'plots', 'ai-integration'], supportedCellTypes: [ExpandedCellType.Code, ExpandedCellType.Data, ExpandedCellType.Visualization] },
        { id: 'javascript-node', name: 'Node.js', language: 'javascript', status: 'idle', version: '18.12.1', capabilities: ['web-component', 'terminal'], supportedCellTypes: [ExpandedCellType.Code, ExpandedCellType.WebComponent, ExpandedCellType.Terminal] },
        { id: 'sql-postgres', name: 'PostgreSQL', language: 'sql', status: 'idle', version: '14.5', capabilities: ['database-query'], supportedCellTypes: [ExpandedCellType.SQL] },
        { id: 'openai-gpt4', name: 'GPT-4', language: 'ai', status: 'idle', version: '4.0', capabilities: ['text-generation', 'code-generation', 'analysis'], supportedCellTypes: [ExpandedCellType.AIChat] },
    ];
};

export const parseCodeOutputs = (rawOutput: string, language: string): any[] => {
    try {
        if (rawOutput.startsWith('{') && rawOutput.endsWith('}')) {
            const parsed = JSON.parse(rawOutput);
            if (parsed.type === 'dataframe') {
                return [{
                    type: 'execute_result',
                    data: { 'application/json': parsed.data, 'text/plain': `DataFrame (${parsed.data.length} rows, ${Object.keys(parsed.data[0] || {}).length} cols)` },
                    metadata: { type: 'dataframe' }
                }];
            }
        }
        if (rawOutput.startsWith('IMAGE_BASE64:')) {
            return [{ type: 'execute_result', data: { 'image/png': rawOutput.substring('IMAGE_BASE64:'.length) }, metadata: { format: 'png' } }];
        }
        return [{ type: 'stream', name: 'stdout', text: rawOutput }];
    } catch (e: any) {
        return [{ type: 'error', name: 'Parsing Error', message: `Failed to parse output: ${e.message}\nRaw: ${rawOutput}` }];
    }
};

export const getMarkdownHeadings = (markdownContent: string) => {
    const headings: { id: string; text: string; level: number; }[] = [];
    const lines = markdownContent.split('\n');
    lines.forEach((line, index) => {
        const match = line.match(/^(#+)\s(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2];
            headings.push({ id: `heading-${index}-${text.replace(/\s+/g, '-').toLowerCase()}`, text, level });
        }
    });
    return headings;
};

// --- 4. Sub-components ---

export const MarkdownCell: React.FC<GeneralCellProps> = ({ cell, isEditing, onFocus, onUpdateContent }) => {
    const { id, content, comments } = cell;
    const [isHovered, setIsHovered] = useState(false);
    const [editorContent, setEditorContent] = useState(content);

    useEffect(() => { setEditorContent(content); }, [content]);

    const handleContentChange = useCallback(debounce((value: string) => {
        onUpdateContent(value, true);
    }, 500), [onUpdateContent]);

    return (
        <div
            id={`cell-${id}`}
            className={`relative p-3 rounded-lg border ${isEditing ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'} ${isHovered ? 'bg-gray-800/50' : ''}`}
            onClick={onFocus}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && <CellControls cellId={id} cellType={ExpandedCellType.Markdown} className="absolute top-2 right-2 z-10" />}
            {isEditing ? (
                <textarea
                    className="w-full bg-gray-800 text-white p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                    value={editorContent}
                    onChange={(e) => {
                        setEditorContent(e.target.value);
                        handleContentChange(e.target.value);
                    }}
                    rows={Math.max(3, editorContent.split('\n').length + 1)}
                />
            ) : (
                <div className="prose prose-invert max-w-none break-words" dangerouslySetInnerHTML={{ __html: (window as any).marked ? (window as any).marked.parse(content || '') : content }}></div>
            )}
            {comments && comments.length > 0 && <CommentSection comments={comments} cellId={id} />}
        </div>
    );
};

export const DataCell: React.FC<GeneralCellProps> = ({ cell, isEditing, onFocus }) => {
    const { id, content, comments } = cell;
    const [isHovered, setIsHovered] = useState(false);
    const displayData = content?.data || [];
    const columns = content?.columns || [];

    return (
        <div
            id={`cell-${id}`}
            className={`relative p-3 rounded-lg border ${isEditing ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'} ${isHovered ? 'bg-gray-800/50' : ''}`}
            onClick={onFocus}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && <CellControls cellId={id} cellType={ExpandedCellType.Data} className="absolute top-2 right-2 z-10" />}
            <h3 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">📊</span> Data Table <span className="text-gray-400 text-sm ml-2">({displayData.length} rows, {columns.length} columns)</span>
            </h3>
            <div className="overflow-x-auto bg-gray-800 rounded-md p-2 max-h-80 border border-gray-700">
                <table className="min-w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                        <tr>
                            {columns.map((col: string, idx: number) => (
                                <th key={idx} scope="col" className="px-6 py-3">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.slice(0, 10).map((row: any[], rowIndex: number) => (
                            <tr key={rowIndex} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                                {row.map((val: any, colIndex: number) => (
                                    <td key={colIndex} className="px-6 py-4">{String(val).substring(0, 50)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {comments && comments.length > 0 && <CommentSection comments={comments} cellId={id} />}
        </div>
    );
};

export const VisualizationCell: React.FC<GeneralCellProps> = ({ cell, isEditing, onFocus, onUpdateContent }) => {
    const { id, content, comments } = cell;
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div
            id={`cell-${id}`}
            className={`relative p-3 rounded-lg border ${isEditing ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'} ${isHovered ? 'bg-gray-800/50' : ''}`}
            onClick={onFocus}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && <CellControls cellId={id} cellType={ExpandedCellType.Visualization} className="absolute top-2 right-2 z-10" />}
            <h3 className="font-semibold mb-2">📈 Data Visualization</h3>
             <div className="bg-gray-800 p-4 rounded-md h-64 flex flex-col items-center justify-center text-gray-400 text-center border border-gray-600 border-dashed">
                <p className="text-lg font-bold mb-2">{content?.chartSpec?.title || 'Untitled Chart'}</p>
                <p>Chart Type: {content?.chartSpec?.type || 'Bar'}</p>
                <p className="text-xs mt-2">Visualization Placeholder</p>
            </div>
            {comments && comments.length > 0 && <CommentSection comments={comments} cellId={id} />}
        </div>
    );
};

export const AIChatCell: React.FC<GeneralCellProps> = ({ cell, isEditing, onFocus, onUpdateContent, onExecute }) => {
    const { id, content, outputs, status, executionCount, comments } = cell;
    const [isHovered, setIsHovered] = useState(false);
    const [input, setInput] = useState(content?.prompt || '');

    const handleExecute = () => {
        onUpdateContent({ prompt: input }, true);
        onExecute?.();
    };

    return (
        <div
            id={`cell-${id}`}
            className={`relative p-3 rounded-lg border ${isEditing ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'} ${isHovered ? 'bg-gray-800/50' : ''}`}
            onClick={onFocus}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && <CellControls cellId={id} cellType={ExpandedCellType.AIChat} className="absolute top-2 right-2 z-10" />}
            <h3 className="font-semibold mb-2 flex items-center">
                <span className="mr-2">🤖</span> AI Assistant Chat
                <CellStatusIndicator status={status} executionCount={executionCount} />
            </h3>
            <div className="flex flex-col space-y-2 mb-2 max-h-64 overflow-y-auto bg-gray-900 p-2 rounded-md border border-gray-700">
                {(outputs || []).map((output: any, index: number) => (
                    <div key={index} className={`p-2 rounded-lg max-w-[80%] text-sm ${output.role === 'user' ? 'bg-blue-900 self-end' : 'bg-gray-700 self-start'}`}>
                        <strong className="capitalize text-xs text-gray-400 block mb-1">{output.role}</strong> {output.text}
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <textarea
                    className="flex-grow bg-gray-800 text-white p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                    placeholder="Ask the AI..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={2}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleExecute();
                        }
                    }}
                />
                <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded text-sm disabled:opacity-50"
                    onClick={handleExecute}
                    disabled={status === 'running'}
                >
                    Send
                </button>
            </div>
            {comments && comments.length > 0 && <CommentSection comments={comments} cellId={id} />}
        </div>
    );
};

export const CellControls: React.FC<{ cellId: string; cellType: ExpandedCellType; className?: string; position?: 'left' | 'right' }> = ({ cellId, cellType, className, position = 'right' }) => {
    const { addCell, deleteCell, moveCell, executeCell, updateCell } = useNotebook();
    const [showAddOptions, setShowAddOptions] = useState(false);
    const addOptionsRef = useRef<HTMLDivElement>(null);

    const handleAddCell = (type: ExpandedCellType) => {
        const { cells } = useNotebook(); // Need to access cells from context here in real impl, but reusing the one from closure if available or trigger via context method that handles index
        // Simplified: The context addCell should handle insertion after current if no index provided or if we pass index
        // Since we don't have index easily here without lookup:
        // Let's assume addCell accepts index. We need to find index.
        // For this demo, let's just append or use a "insert after active" logic in provider
        addCell(type, {}); // This might append to end if we don't fix addCell signature in provider
        setShowAddOptions(false);
    };

    return (
        <div className={`flex items-center space-x-1 p-1 bg-gray-800 rounded-md shadow-md border border-gray-600 ${className}`}>
             {['code', 'ai_chat', 'sql', 'form'].includes(cellType) && (
                <button title="Run Cell" onClick={(e) => {e.stopPropagation(); executeCell(cellId);}} className="text-gray-400 hover:text-green-400 px-1.5">▶️</button>
            )}
            <button title="Delete Cell" onClick={(e) => {e.stopPropagation(); deleteCell(cellId);}} className="text-gray-400 hover:text-red-400 px-1.5">🗑️</button>
             <button title="Move Up" onClick={(e) => {e.stopPropagation(); /* Logic needs index */}} className="text-gray-400 hover:text-blue-400 px-1.5">⬆️</button>
             <button title="Move Down" onClick={(e) => {e.stopPropagation(); /* Logic needs index */}} className="text-gray-400 hover:text-blue-400 px-1.5">⬇️</button>
        </div>
    );
};

export const CellStatusIndicator: React.FC<{ status?: EnhancedCell['status']; executionCount?: number; executionTime?: EnhancedCell['executionTime']; }> = ({ status, executionCount, executionTime }) => {
    let indicatorClass = '';
    let text = '';
    if (status === 'running') { indicatorClass = 'bg-blue-500 animate-pulse'; text = 'Running'; }
    else if (status === 'queued') { indicatorClass = 'bg-yellow-500'; text = 'Queued'; }
    else if (status === 'success') { indicatorClass = 'bg-green-500'; text = 'Done'; }
    else if (status === 'error') { indicatorClass = 'bg-red-500'; text = 'Error'; }
    else { indicatorClass = 'bg-gray-500'; text = 'Idle'; }

    return (
        <span className="ml-2 flex items-center text-xs text-gray-400 space-x-1">
            <span className={`w-2 h-2 rounded-full ${indicatorClass}`}></span>
            <span>{text}</span>
            {executionTime && <span>({(executionTime.durationMs / 1000).toFixed(2)}s)</span>}
        </span>
    );
};

export const CellOutputDisplay: React.FC<{ outputs?: any[] }> = ({ outputs }) => {
    if (!outputs || outputs.length === 0) return null;
    return (
        <div className="mt-3 p-3 bg-gray-900 rounded-lg border-l-4 border-gray-600 max-h-96 overflow-y-auto font-mono text-sm">
            {outputs.map((output, index) => (
                <div key={index} className="mb-2 last:mb-0 break-all">
                   {JSON.stringify(output)}
                </div>
            ))}
        </div>
    );
};

export const CommentSection: React.FC<{ comments: CellComment[]; cellId: string }> = ({ comments, cellId }) => {
    return (
        <div className="mt-2 border-t border-gray-700 pt-2">
            <div className="text-xs text-gray-500 mb-1">{comments.length} Comments</div>
            {comments.slice(0, 2).map(c => (
                <div key={c.id} className="text-xs text-gray-400 truncate">
                    <strong>{c.author}:</strong> {c.text}
                </div>
            ))}
        </div>
    );
};


// --- Layout Components ---

export const NotebookToolbar: React.FC = () => {
    const { addCell, runAllCells, saveNotebook, commandPaletteOpen, setCommandPaletteOpen, aiAssistantOpen, setAiAssistantOpen } = useNotebook();
    
    return (
        <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 sticky top-0 z-30 shadow-md">
            <div className="flex items-center space-x-2">
                <div className="font-bold text-lg text-blue-400 mr-4">Universal Notebook</div>
                <button onClick={() => addCell(ExpandedCellType.Code, {})} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-1">➕ Code</button>
                <button onClick={() => addCell(ExpandedCellType.Markdown, '')} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-1">➕ Text</button>
                <div className="h-6 w-px bg-gray-600 mx-2"></div>
                <button onClick={runAllCells} className="p-1.5 bg-green-900/50 text-green-400 hover:bg-green-900 rounded" title="Run All">▶️</button>
                <button onClick={saveNotebook} className="p-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded" title="Save">💾</button>
            </div>
            <div className="flex items-center space-x-3">
                 <button onClick={() => setAiAssistantOpen(!aiAssistantOpen)} className={`p-1.5 rounded ${aiAssistantOpen ? 'bg-purple-900 text-purple-300' : 'text-purple-400 hover:bg-gray-700'}`}>🤖 AI</button>
                 <button onClick={() => setCommandPaletteOpen(true)} className="p-1.5 text-yellow-400 hover:bg-gray-700 rounded">⌘K</button>
            </div>
        </div>
    );
};

export const NotebookSidebar: React.FC = () => {
    const { activeSidebarPanel, toggleSidebarPanel, cells, setActiveCellId } = useNotebook();
    
    const outline = cells.filter(c => c.type === ExpandedCellType.Markdown).map(c => ({
        id: c.id, 
        text: (c.content as string).split('\n')[0].replace(/#/g, '').trim() || 'Untitled'
    })).filter(o => o.text);

    return (
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col hidden md:flex">
             <div className="flex border-b border-gray-700 text-xs">
                {['outline', 'files', 'vars'].map((p) => (
                    <button 
                        key={p} 
                        onClick={() => toggleSidebarPanel(p as any)}
                        className={`flex-1 py-2 uppercase tracking-wider ${activeSidebarPanel === p ? 'bg-gray-700 text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {p}
                    </button>
                ))}
             </div>
             <div className="flex-grow overflow-y-auto p-2">
                 {activeSidebarPanel === 'outline' && (
                     <div className="space-y-1">
                         <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Table of Contents</div>
                         {outline.map((item, i) => (
                             <div key={i} onClick={() => {
                                 setActiveCellId(item.id);
                                 document.getElementById(`cell-${item.id}`)?.scrollIntoView({behavior: 'smooth', block: 'center'});
                             }} className="text-sm text-gray-400 hover:text-white cursor-pointer truncate px-2 py-1 rounded hover:bg-gray-700">
                                 {item.text}
                             </div>
                         ))}
                         {outline.length === 0 && <div className="text-xs text-gray-600 italic p-2">No headings found</div>}
                     </div>
                 )}
                 {activeSidebarPanel === 'files' && (
                     <div className="text-sm text-gray-400 p-2">
                         <div>📁 project/</div>
                         <div className="pl-4">📄 data.csv</div>
                         <div className="pl-4">📄 analysis.ipynb</div>
                         <div className="pl-4">📄 utils.py</div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export const AIAssistantPanel: React.FC = () => {
    const { aiAssistantOpen } = useNotebook();
    if (!aiAssistantOpen) return null;
    return (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shadow-xl z-20 absolute right-0 top-12 bottom-8 md:relative md:top-0 md:bottom-0">
            <div className="p-3 bg-purple-900/20 border-b border-gray-700 font-bold text-purple-300">AI Assistant</div>
            <div className="flex-grow p-4 text-gray-400 text-sm flex items-center justify-center italic">
                AI Assistant is ready to help you code, analyze, and visualize.
            </div>
            <div className="p-3 border-t border-gray-700">
                <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:border-purple-500 outline-none" placeholder="Ask anything..." />
            </div>
        </div>
    );
};

export const StatusBar: React.FC = () => {
    const { notebookMetadata, notifications } = useNotebook();
    const lastNotif = notifications[notifications.length - 1];
    
    return (
        <div className="h-8 bg-gray-900 border-t border-gray-700 flex items-center justify-between px-4 text-xs text-gray-500 z-30">
            <div className="flex items-center space-x-4">
                <span>Kernel: {notebookMetadata.defaultKernelId}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Ready</span>
            </div>
            <div className="truncate max-w-md text-gray-400">
                {lastNotif ? lastNotif.message : "Ready"}
            </div>
            <div>
                Universal Notebook v2.0
            </div>
        </div>
    );
};

export const CommandPalette: React.FC = () => {
    const { commandPaletteOpen, setCommandPaletteOpen } = useNotebook();
    if (!commandPaletteOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20" onClick={() => setCommandPaletteOpen(false)}>
            <div className="w-full max-w-lg bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <input autoFocus className="w-full bg-gray-800 p-4 text-lg text-white border-b border-gray-700 outline-none" placeholder="Type a command..." />
                <div className="p-2">
                    <div className="text-xs text-gray-500 mb-2 px-2">Suggestions</div>
                    <div className="px-2 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm">Add Code Cell</div>
                    <div className="px-2 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm">Run All Cells</div>
                    <div className="px-2 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm">Export to HTML</div>
                    <div className="px-2 py-2 hover:bg-gray-700 rounded cursor-pointer text-sm">Restart Kernel</div>
                </div>
            </div>
        </div>
    );
};

// --- 6. Main Notebook Logic ---

export const Notebook: React.FC = () => {
    const [cells, setCells] = useState<EnhancedCell[]>([
        { id: generateUniqueId('cell'), type: ExpandedCellType.Markdown, content: '# Universal Notebook\nWelcome to the future of interactive computing.', metadata: {}, comments: [] },
        { id: generateUniqueId('cell'), type: ExpandedCellType.Code, content: { code: 'print("Hello World")', language: 'python' }, status: 'idle', executionCount: 1, metadata: {}, comments: [] },
        { id: generateUniqueId('cell'), type: ExpandedCellType.Data, content: { data: [['ID', 'Name'], [1, 'Alpha'], [2, 'Beta']], columns: ['ID', 'Name'] }, metadata: {}, comments: [] },
        { id: generateUniqueId('cell'), type: ExpandedCellType.AIChat, content: { prompt: '' }, status: 'idle', metadata: {}, comments: [] },
    ]);
    
    const [activeCellId, setActiveCellId] = useState<string | null>(cells[0]?.id || null);
    const [notebookMetadata, setNotebookMetadata] = useState<NotebookMetadata>({
        id: 'nb-1', title: 'Untitled', description: '', author: 'User', createdAt: new Date().toISOString(), lastModified: new Date().toISOString(), visibility: 'private', sharedWith: [], kernels: [], defaultKernelId: 'python-3', theme: 'dark', settings: {}
    });
    
    const [users] = useState<UserProfile[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [activeSidebarPanel, setActiveSidebarPanel] = useState<'outline' | 'variables' | 'files' | 'plugins'>('outline');

    const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        setNotifications(prev => [...prev, { id: generateUniqueId('notif'), timestamp: new Date().toISOString(), read: false, ...n }]);
        setTimeout(() => setNotifications(prev => prev.slice(1)), 5000); // Auto dismiss
    }, []);

    const updateCell = useCallback((cellId: string, updates: Partial<EnhancedCell>, pushToHistory = false) => {
        setCells(prev => prev.map(c => c.id === cellId ? { ...c, ...updates } : c));
    }, []);

    const executeCell = useCallback(async (cellId: string) => {
        updateCell(cellId, { status: 'running' });
        addNotification({ type: 'info', message: 'Executing cell...' });
        
        setTimeout(() => {
             // Mock execution result
             updateCell(cellId, { 
                 status: 'success', 
                 outputs: [{ type: 'stream', name: 'stdout', text: 'Execution completed successfully.\n[Result]: 42' }],
                 executionCount: (cells.find(c => c.id === cellId)?.executionCount || 0) + 1,
                 executionTime: { start: '', end: '', durationMs: 450 }
             });
        }, 800);
    }, [addNotification, cells, updateCell]);

    const addCell = useCallback((type: ExpandedCellType, content: any, index?: number, metadata?: Record<string, any>) => {
        const newCell: EnhancedCell = {
            id: generateUniqueId('cell'), type, content, metadata: metadata || {}, outputs: [], executionCount: 0, status: 'idle', comments: []
        };
        setCells(prev => [...prev, newCell]);
        setActiveCellId(newCell.id);
        addNotification({ type: 'info', message: `Added ${type} cell` });
    }, [addNotification]);

    const deleteCell = useCallback((cellId: string) => {
        setCells(prev => prev.filter(c => c.id !== cellId));
        addNotification({ type: 'info', message: 'Cell deleted' });
    }, [addNotification]);

    const moveCell = useCallback((from: number, to: number) => {}, []);
    const runAllCells = useCallback(async () => {
        addNotification({type: 'info', message: 'Running all cells...'});
        cells.forEach(c => {
            if(['code', 'sql'].includes(c.type)) executeCell(c.id);
        });
    }, [cells, executeCell, addNotification]);
    
    const saveNotebook = useCallback(async () => { addNotification({type: 'success', message: 'Notebook Saved'}); }, [addNotification]);
    const loadNotebook = useCallback(async (id: string) => {}, []);
    const undo = useCallback(() => {}, []);
    const redo = useCallback(() => {}, []);
    const toggleSidebarPanel = useCallback((p: any) => setActiveSidebarPanel(p), []);

    const contextValue: NotebookContextType = {
        notebookId: notebookMetadata.id, cells, activeCellId, setActiveCellId, notebookMetadata, setNotebookMetadata,
        users, notifications, addNotification, executeCell, updateCell, addCell, deleteCell, moveCell,
        runAllCells, undo, redo, commandPaletteOpen, setCommandPaletteOpen, aiAssistantOpen, setAiAssistantOpen,
        globalSearchTerm, setGlobalSearchTerm, saveNotebook, loadNotebook, toggleSidebarPanel, activeSidebarPanel
    };

    return (
        <NotebookContext.Provider value={contextValue}>
            <div className="flex flex-col h-full bg-gray-900 text-white font-sans overflow-hidden">
                <NotebookToolbar />
                <div className="flex flex-grow overflow-hidden relative">
                    <NotebookSidebar />
                    <main className="flex-grow overflow-y-auto p-4 md:p-8 scroll-smooth" onClick={() => setActiveCellId(null)}>
                        <div className="max-w-5xl mx-auto space-y-6 pb-20">
                            {cells.map(cell => {
                                const isEditing = activeCellId === cell.id;
                                const props: GeneralCellProps = {
                                    cell,
                                    isEditing,
                                    onFocus: () => setActiveCellId(cell.id),
                                    onUpdateContent: (c, h) => updateCell(cell.id, { content: c }, h),
                                    onExecute: () => executeCell(cell.id)
                                };

                                switch (cell.type) {
                                    case ExpandedCellType.Code: return <CodeCell key={cell.id} {...props} />;
                                    case ExpandedCellType.Markdown: return <MarkdownCell key={cell.id} {...props} />;
                                    case ExpandedCellType.Data: return <DataCell key={cell.id} {...props} />;
                                    case ExpandedCellType.Visualization: return <VisualizationCell key={cell.id} {...props} />;
                                    case ExpandedCellType.AIChat: return <AIChatCell key={cell.id} {...props} />;
                                    default: return <div key={cell.id} className="p-4 border border-red-900 bg-red-900/20 text-red-200 rounded">Unsupported cell type: {cell.type}</div>;
                                }
                            })}
                             {/* Quick Add Area at Bottom */}
                            <div className="h-32 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center text-gray-600 hover:border-gray-600 hover:text-gray-400 cursor-pointer transition-colors" onClick={() => addCell(ExpandedCellType.Code, {})}>
                                Click to add Code Cell
                            </div>
                        </div>
                    </main>
                    <AIAssistantPanel />
                </div>
                <StatusBar />
                <CommandPalette />
            </div>
        </NotebookContext.Provider>
    );
};