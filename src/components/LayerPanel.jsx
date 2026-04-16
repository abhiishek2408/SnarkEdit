import React from 'react';
import { 
  Layers, Eye, EyeOff, Trash2, GripVertical, 
  Type, ImageIcon, MousePointer2, X
} from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

const LayerPanel = ({ 
  layers, 
  setLayers, 
  selectedLayerId, 
  setSelectedLayerId,
  setShowLayerPanel
}) => {
  if (layers.length === 0) return null;

  const toggleVisibility = (id) => {
    setLayers(prev => prev.map(l => (l.id === id ? { ...l, hidden: !l.hidden } : l)));
  };

  const deleteLayer = (id) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  return (
    <div className="layer-panel glass" style={{
      width: '240px',
      position: 'absolute',
      right: '1rem',
      top: '6.5rem',
      zIndex: 100,
      padding: '1rem',
      maxHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem',
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={14} color="var(--primary)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-main)' }}>Layers</span>
        </div>
        <button 
          onClick={() => setShowLayerPanel(false)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s'
          }}
          className="close-panel-btn"
        >
          <X size={16} />
        </button>
      </div>

      <Reorder.Group axis="y" values={layers} onReorder={setLayers} style={{ listStyle: 'none', padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '4px' }}>
        {layers.map((layer) => (
          <Reorder.Item 
            key={layer.id} 
            value={layer} 
            className={`layer-item-row ${selectedLayerId === layer.id ? 'active' : ''}`}
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: selectedLayerId === layer.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
              border: selectedLayerId === layer.id ? '1px solid var(--primary)' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}
            onMouseDown={() => setSelectedLayerId(layer.id)}
          >
            <GripVertical size={12} color="var(--text-muted)" style={{ cursor: 'grab' }} />
            
            <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
              {layer.type === 'text' && <Type size={12} />}
              {layer.type === 'image' && <ImageIcon size={12} />}
              {layer.type === 'sticker' && <span style={{ fontSize: '10px' }}>😊</span>}
            </div>

            <span style={{ 
              flex: 1, 
              fontSize: '0.7rem', 
              fontWeight: 600, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              opacity: layer.hidden ? 0.4 : 1
            }}>
              {layer.type === 'text' ? layer.data : (layer.label || layer.type.charAt(0).toUpperCase() + layer.type.slice(1))}
            </span>

            <button 
              onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              {layer.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', opacity: 0, transition: 'opacity 0.2s' }}
              className="delete-hover"
            >
              <Trash2 size={12} />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <style>{`
        .layer-item-row:hover .delete-hover { opacity: 1 !important; }
        .layer-item-row.active { box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
        .close-panel-btn:hover { background: var(--tool-bg); color: #ef4444; }
      `}</style>
    </div>
  );
};

export default LayerPanel;
