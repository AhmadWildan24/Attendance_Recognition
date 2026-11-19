const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.35;
const IOU_THRESHOLD = 0.45;

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

// Mengubah gambar webcam menjadi tensor YOLO [1, 3, 640, 640]
export function preprocessFrame(video) {
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgb(114, 114, 114)";
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

  const scale = Math.min(
    INPUT_SIZE / video.videoWidth,
    INPUT_SIZE / video.videoHeight
  );

  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  const padX = (INPUT_SIZE - width) / 2;
  const padY = (INPUT_SIZE - height) / 2;

  ctx.drawImage(video, padX, padY, width, height);

  const pixels = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const tensorData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const area = INPUT_SIZE * INPUT_SIZE;

  for (let i = 0; i < area; i++) {
    tensorData[i] = pixels[i * 4] / 255;
    tensorData[area + i] = pixels[i * 4 + 1] / 255;
    tensorData[2 * area + i] = pixels[i * 4 + 2] / 255;
  }

  return {
    tensorData,
    scale,
    padX,
    padY,
    originalWidth: video.videoWidth,
    originalHeight: video.videoHeight,
  };
}

// Menghitung IoU antara dua kotak wajah
function calculateIoU(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);

  const intersection =
    Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);

  return intersection / (areaA + areaB - intersection + 1e-6);
}

// Menyaring kotak wajah yang bertumpuk
function nonMaximumSuppression(boxes) {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const selected = [];

  while (sorted.length > 0) {
    const best = sorted.shift();
    selected.push(best);

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (calculateIoU(best, sorted[i]) > IOU_THRESHOLD) {
        sorted.splice(i, 1);
      }
    }
  }

  return selected;
}

// Membaca tiga output YOLOv8-Face

export function decodeYOLO(outputs, info) {
  const strides = [8, 16, 32];
  const candidates = [];

  outputs.forEach((output, outputIndex) => {
    const [, channels, height, width] = output.dims;
    const data = output.data;
    const stride = strides[outputIndex];

    if (channels !== 80) {
      throw new Error(`Output YOLO tidak sesuai: ${channels} channel`);
    }

    const featureSize = height * width;

    for (let i = 0; i < featureSize; i++) {
      const score = sigmoid(data[64 * featureSize + i]);

      if (score < CONF_THRESHOLD) continue;

      const gridX = i % width;
      const gridY = Math.floor(i / width);

      // Decode bounding box menggunakan DFL
      const distances = [];

      for (let side = 0; side < 4; side++) {
        const values = [];

        for (let j = 0; j < 16; j++) {
          values.push(data[(side * 16 + j) * featureSize + i]);
        }

        const probabilities = softmax(values);

        const distance = probabilities.reduce(
          (sum, probability, index) => sum + probability * index,
          0
        );

        distances.push(distance);
      }

      const x1 = (gridX + 0.5 - distances[0]) * stride;
      const y1 = (gridY + 0.5 - distances[1]) * stride;
      const x2 = (gridX + 0.5 + distances[2]) * stride;
      const y2 = (gridY + 0.5 + distances[3]) * stride;

      // Decode 5 facial landmarks
      const landmarks = [];

      for (let k = 0; k < 5; k++) {
        const rawX = data[(65 + k * 3) * featureSize + i];
        const rawY = data[(66 + k * 3) * featureSize + i];

        const landmarkX = (rawX * 2 + gridX) * stride;
        const landmarkY = (rawY * 2 + gridY) * stride;

        landmarks.push({
          x: (landmarkX - info.padX) / info.scale,
          y: (landmarkY - info.padY) / info.scale,
        });
      }

      const box = {
        x1: Math.max(0, (x1 - info.padX) / info.scale),
        y1: Math.max(0, (y1 - info.padY) / info.scale),
        x2: Math.min(
          info.originalWidth,
          (x2 - info.padX) / info.scale
        ),
        y2: Math.min(
          info.originalHeight,
          (y2 - info.padY) / info.scale
        ),
        score,
        landmarks,
      };

      if (box.x2 > box.x1 && box.y2 > box.y1) {
        candidates.push(box);
      }
    }
  });

  return nonMaximumSuppression(candidates);
}

