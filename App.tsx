import React from 'react';
import { Notebook } from './components/Notebook';

const App: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden">
      <Notebook />
    </div>
  );
};

export default App;