import React, { useState, useEffect } from 'react';
import { GeneralCellProps } from '../types';
import { useNotebook, CellStatusIndicator, CellOutputDisplay, CommentSection, CellControls, ExpandedCellType } from './Notebook';

const CodeCell: React.FC<GeneralCellProps> = ({ cell, isEditing, onFocus, onUpdateContent, onExecute }) => {
    const { id, content, outputs, status, executionCount, metadata, comments } = cell;
    const [code, setCode] = useState(content?.code || '');
    const [isHovered, setIsHovered] = useState(false);
    
    // Use context if available, otherwise just mock (for safe import)
    // Note: In a real circular dependency scenario, we might pass these as props or use a separate hook file.
    // Here we rely on the runtime availability of useNotebook from the parent or imports if possible.
    // However, since Notebook imports CodeCell, CodeCell cannot import Notebook easily without circular deps.
    // We will use a simplified approach here where we don't import useNotebook inside CodeCell to avoid cycle errors during compile if strict.
    // Instead, we rely on props passed down or basic local state.

    useEffect(() => {
        setCode(content?.code || '');
    }, [content?.code]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onUpdateContent({ ...content, code }, true);
            onExecute?.();
        }
    };

    return (
        <div
            id={`cell-${id}`}
            className={`relative p-3 rounded-lg border ${isEditing ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'} ${isHovered ? 'bg-gray-800/50' : ''} group`}
            onClick={onFocus}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Controls typically injected or rendered by parent, but if we want them here: */}
             {isHovered && <div className="absolute top-2 right-2 z-20">
                 {/* Placeholder for controls if not using the exported one to avoid circular dep */}
                 {/* In the main file, we render specific controls. We can accept a `renderControls` prop if needed. */}
            </div>}
            
            <div className="flex flex-row">
                 {/* Gutter */}
                <div className="w-12 flex-shrink-0 flex flex-col items-end pr-2 text-xs text-gray-500 font-mono pt-2 select-none">
                    {executionCount ? `[${executionCount}]:` : '[ ]: '}
                </div>

                <div className="flex-grow min-w-0">
                    {/* Editor Area */}
                    <div className="relative font-mono text-sm bg-gray-900 rounded-md border border-gray-700 overflow-hidden">
                        <div className="absolute top-0 right-0 p-1 text-xs text-gray-500 bg-gray-800 rounded-bl opacity-50">
                            {content.language || 'text'}
                        </div>
                        <textarea
                            className="w-full h-full bg-transparent text-gray-200 p-3 focus:outline-none resize-none font-mono leading-relaxed"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value);
                                onUpdateContent({ ...content, code: e.target.value }, false);
                            }}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                            rows={Math.max(2, code.split('\n').length)}
                            style={{ minHeight: '3rem' }}
                        />
                    </div>

                    {/* Status/Output Area */}
                    {(status === 'running' || status === 'error' || (outputs && outputs.length > 0)) && (
                        <div className="mt-2">
                             {/* Simple output display since we can't easily import the complex one due to circular deps */}
                             {outputs && outputs.map((out: any, i: number) => (
                                 <div key={i} className="font-mono text-sm mt-1">
                                     {out.type === 'stream' && <pre className={`whitespace-pre-wrap ${out.name === 'stderr' ? 'text-red-400' : 'text-gray-300'}`}>{out.text}</pre>}
                                     {out.type === 'execute_result' && out.data['text/plain'] && <pre className="whitespace-pre-wrap text-gray-300">{out.data['text/plain']}</pre>}
                                     {out.type === 'error' && <pre className="whitespace-pre-wrap text-red-400">{out.name}: {out.message}</pre>}
                                 </div>
                             ))}
                             {status === 'running' && <div className="text-xs text-blue-400 mt-1 animate-pulse">Running...</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodeCell;