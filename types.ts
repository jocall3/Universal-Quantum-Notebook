export type CellType = 'code' | 'markdown' | 'data' | 'visualization' | 'ai_chat' | 'sql' | 'drawing' | 'form' | string;

export interface Cell {
    id: string;
    type: CellType;
    content: any;
    metadata?: Record<string, any>;
}

export interface GeneralCellProps {
    cell: any; // Using any here to avoid circular dependency with EnhancedCell in Notebook.tsx, usually better to structure types in a separate package or file
    isEditing: boolean;
    onFocus: () => void;
    onUpdateContent: (newContent: any, pushToHistory?: boolean) => void;
    onExecute?: () => void;
}
