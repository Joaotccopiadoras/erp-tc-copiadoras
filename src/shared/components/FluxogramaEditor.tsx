import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface FluxogramaProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    edges: Edge[];
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export default function FluxogramaEditor({ nodes, setNodes, edges, setEdges }: FluxogramaProps) {
  const [noSelecionado, setNoSelecionado] = useState<Node | null>(null);
  let idRef = useRef(Date.now());

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    []
  );

  const onNodeClick = (_: any, node: Node) => {
    setNoSelecionado(node);
  };

  const onPaneClick = () => {
    setNoSelecionado(null);
  };

  const adicionarNo = () => {
    const novoId = (idRef.current++).toString();
    const novoNo: Node = {
      id: novoId,
      position: { x: Math.random() * 100 + 50, y: Math.random() * 100 + 50 },
      data: { label: `Nova Etapa ${novoId}` },
    };
    setNodes((nds) => nds.concat(novoNo));
  };

  const excluirNoSelecionado = () => {
    if (!noSelecionado) return;
    setNodes((nds) => nds.filter((node) => node.id !== noSelecionado.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== noSelecionado.id && edge.target !== noSelecionado.id));
    setNoSelecionado(null);
  };

  const atualizarTextoDoNo = (novoTexto: string) => {
    if (!noSelecionado) return;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === noSelecionado.id) {
            return {
                ...node,
                data: { ...node.data, label: novoTexto }
        };
        }
        return node;
      })
    );
    setNoSelecionado({ ...noSelecionado, data: { label: novoTexto } });
  };

  return (
    <div className="w-full h-[500px] border rounded-md bg-slate-50 relative flex flex-col area-fluxograma">      
      {noSelecionado && (
        <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded-md border shadow-sm flex items-center gap-2">
          <Input 
            value={noSelecionado.data.label} 
            onChange={(e) => atualizarTextoDoNo(e.target.value)}
            className="w-64 h-8 text-sm"
            placeholder="Nome da etapa..."
          />
          <Button variant="destructive" size="sm" onClick={excluirNoSelecionado} className="h-8 px-2">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background gap={16} size={1} color="#cbd5e1" />
        <Controls />
        <Panel position="top-right">
          <Button onClick={adicionarNo} size="sm" className="gap-2 shadow-md">
            <Plus className="w-4 h-4" /> Adicionar Etapa
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}