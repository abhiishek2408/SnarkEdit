import React, { useEffect, useMemo, useState } from 'react';
import { Download, Image as ImageIcon, Sparkles, SlidersHorizontal, Upload, Wand2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG', mime: 'image/png', extension: 'png' },
  { value: 'jpg', label: 'JPG', mime: 'image/jpeg', extension: 'jpg' },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg', extension: 'jpeg' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', extension: 'webp' },
];

const DEFAULT_SETTINGS = {
  brightness: 6,
  contrast: 16,
  saturation: 14,
  warmth: 4,
  sharpness: 35,
  quality: 92,
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const blobFromCanvas = (canvas, type, quality) => (
  new Promise((resolve) => canvas.toBlob(resolve, type, quality))
);

const loadImage = (file) => (
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    image.src = url;
  })
);

const clampChannel = (value) => Math.max(0, Math.min(255, value));

const applyWarmth = (canvas, warmth) => {
  if (!warmth) return;

  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const redShift = warmth * 1.4;
  const blueShift = warmth * 1.1;

  for (let index = 0; index < data.length; index += 4) {
    data[index] = clampChannel(data[index] + redShift);
    data[index + 2] = clampChannel(data[index + 2] - blueShift);
  }

  context.putImageData(imageData, 0, 0);
};

const applySharpen = (canvas, amount) => {
  if (!amount) return;

  const context = canvas.getContext('2d');
  const source = context.getImageData(0, 0, canvas.width, canvas.height);
  const output = context.createImageData(source);
  const { width, height } = canvas;
  const data = source.data;
  const out = output.data;
  const strength = Math.max(0, Math.min(1.2, amount / 100));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;

      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        out[index] = data[index];
        out[index + 1] = data[index + 1];
        out[index + 2] = data[index + 2];
        out[index + 3] = data[index + 3];
        continue;
      }

      const top = index - width * 4;
      const bottom = index + width * 4;
      const left = index - 4;
      const right = index + 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const center = data[index + channel];
        const neighborAverage = (
          data[top + channel]
          + data[bottom + channel]
          + data[left + channel]
          + data[right + channel]
        ) / 4;
        out[index + channel] = clampChannel(center + (center - neighborAverage) * strength);
      }
      out[index + 3] = data[index + 3];
    }
  }

  context.putImageData(output, 0, 0);
};

const enhanceImage = async (file, settings, output) => {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');

  if (output.mime === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.filter = [
    `brightness(${100 + Number(settings.brightness)}%)`,
    `contrast(${100 + Number(settings.contrast)}%)`,
    `saturate(${100 + Number(settings.saturation)}%)`,
  ].join(' ');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.filter = 'none';

  applyWarmth(canvas, Number(settings.warmth));
  applySharpen(canvas, Number(settings.sharpness));

  const quality = output.mime === 'image/png' ? undefined : Number(settings.quality) / 100;
  const blob = await blobFromCanvas(canvas, output.mime, quality);
  if (!blob) throw new Error('Could not enhance image');

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
  };
};

const ImageEnhancerPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [outputFormat, setOutputFormat] = useState('png');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedOutput = useMemo(() => (
    OUTPUT_FORMATS.find(format => format.value === outputFormat) || OUTPUT_FORMATS[0]
  ), [outputFormat]);

  useEffect(() => {
    if (!file) {
      setOriginalUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!result?.blob) {
      setPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: Number(value) }));
    setResult(null);
  };

  const handleFileChange = (nextFile) => {
    setFile(nextFile);
    setResult(null);
    setPreviewUrl('');
    setError('');
  };

  const handleEnhance = async () => {
    if (!file) {
      setError('Please choose an image first.');
      return;
    }

    setError('');
    setResult(null);
    setIsProcessing(true);

    try {
      const enhanced = await enhanceImage(file, settings, selectedOutput);
      setResult(enhanced);
    } catch (err) {
      setError(err.message || 'Enhancement failed. Try another image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result?.blob) return;

    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'enhanced-image';
    link.href = url;
    link.download = `${baseName}-enhanced.${selectedOutput.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container reducer-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />

      <main className="reducer-shell">
        <section className="reducer-workspace">
          <div className="reducer-heading">
            <div>
              <p>Image Enhancer</p>
              <h1>Improve clarity, color and detail</h1>
            </div>
            <Sparkles size={34} />
          </div>

          <div className="reducer-grid enhancer-grid">
            <div className="reducer-panel">
              <label className="reducer-upload">
                <Upload size={24} />
                <strong>{file ? file.name : 'Choose image'}</strong>
                <span>{file ? formatBytes(file.size) : 'Upload JPG, PNG, WebP or any browser-supported image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                />
              </label>

              <div className="enhancer-toolbar">
                <button
                  type="button"
                  className="reducer-plain-btn"
                  onClick={() => setSettings(DEFAULT_SETTINGS)}
                >
                  <Wand2 size={14} />
                  <span>Auto enhance</span>
                </button>

                <label>
                  <span>Output</span>
                  <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}>
                    {OUTPUT_FORMATS.map(format => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="enhancer-sliders">
                {[
                  ['brightness', 'Brightness', -40, 40, '%'],
                  ['contrast', 'Contrast', -40, 60, '%'],
                  ['saturation', 'Color', -40, 60, '%'],
                  ['warmth', 'Warmth', -30, 30, ''],
                  ['sharpness', 'Sharpness', 0, 100, '%'],
                ].map(([key, label, min, max, unit]) => (
                  <label key={key} className="quality-control enhancer-control">
                    <div>
                      <span>{label}</span>
                      <strong>{settings[key]}{unit}</strong>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={settings[key]}
                      onChange={(event) => updateSetting(key, event.target.value)}
                    />
                  </label>
                ))}

                <label className="quality-control enhancer-control">
                  <div>
                    <span>Export quality</span>
                    <strong>{settings.quality}%</strong>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={settings.quality}
                    disabled={selectedOutput.mime === 'image/png'}
                    onChange={(event) => updateSetting('quality', event.target.value)}
                  />
                </label>
              </div>

              <button className="btn-primary reducer-action" onClick={handleEnhance} disabled={isProcessing}>
                <SlidersHorizontal size={18} />
                <span>{isProcessing ? 'Enhancing...' : 'Enhance Image'}</span>
              </button>

              {error && <p className="reducer-error">{error}</p>}
            </div>

            <div className="reducer-panel reducer-result enhancer-result">
              {previewUrl && result?.blob ? (
                <>
                  <div className="enhancer-preview-grid">
                    <div>
                      <span>Original</span>
                      <img src={originalUrl} alt="Original preview" />
                    </div>
                    <div>
                      <span>Enhanced</span>
                      <img src={previewUrl} alt="Enhanced preview" />
                    </div>
                  </div>

                  <div className="reducer-stats enhancer-stats">
                    <div>
                      <span>Original</span>
                      <strong>{formatBytes(file?.size)}</strong>
                    </div>
                    <div>
                      <span>Enhanced</span>
                      <strong>{formatBytes(result.blob.size)}</strong>
                    </div>
                    <div>
                      <span>Size</span>
                      <strong>{result.width} x {result.height}</strong>
                    </div>
                    <div>
                      <span>Output</span>
                      <strong>{selectedOutput.label}</strong>
                    </div>
                  </div>

                  <button className="btn-primary reducer-action" onClick={handleDownload}>
                    <Download size={18} />
                    <span>Download</span>
                  </button>
                </>
              ) : (
                <div className="reducer-empty">
                  <ImageIcon size={44} />
                  <p>Your enhanced image preview will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ImageEnhancerPage;
