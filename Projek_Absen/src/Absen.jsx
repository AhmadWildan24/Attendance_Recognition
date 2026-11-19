
import { useRef, useState, useEffect } from "react";
import * as ort from "onnxruntime-web";
import { alignFace } from "./utils/faceAlignment";
import { preprocessFrame, decodeYOLO } from "./utils/yoloface";
import { getAttendanceInfo } from "./utils/attendanceHelper";

function Absensi() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sessionRef = useRef(null);
  const canvasRef = useRef(null);
  const processingRef = useRef(false);
  const alignmentTestedRef = useRef(false);

  const arcFaceSessionRef = useRef(null);
  const [arcFaceStatus, setArcFaceStatus] = useState("ArcFace belum dimuat");
  
  const [modelStatus, setModelStatus] = useState("Model Belum Dimuat");
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");
  const [recognizedLecturer, setRecognizedLecturer] = useState(null);


  const detectFaces = async () => {
  const video = videoRef.current;
  const session = sessionRef.current;

  if (
    !video ||
    !session ||
    video.readyState < 2 ||
    processingRef.current
  ) {
    return;
  }

  processingRef.current = true;

  try {
    const info = preprocessFrame(video);

    const inputTensor = new ort.Tensor(
      "float32",
      info.tensorData,
      [1, 3, 640, 640]
    );

    const results = await session.run({
      [session.inputNames[0]]: inputTensor,
    });

    const outputs = session.outputNames.map(
      (name) => results[name]
    );

    const faces = decodeYOLO(outputs, info);
    // TEST FACE ALIGNMENT - hanya dijalankan satu kali
    if (faces.length > 0 && !alignmentTestedRef.current) {
      const alignedCanvas = alignFace(
        video,
        faces[0].landmarks
      );

      console.log("Face alignment berhasil:", alignedCanvas);

      const previewUrl = alignedCanvas.toDataURL("image/png");
      window.open(previewUrl, "_blank");

      alignmentTestedRef.current = true;
    }

    drawFaces(faces, info.originalWidth, info.originalHeight);
  } catch (err) {
    console.error("Deteksi wajah gagal:", err);
  } finally {
    processingRef.current = false;
  }
};

// Simulasi pengenalan dosen
const simulateRecognition = () => {
  const lecturer = getAttendanceInfo("D001");

  setRecognizedLecturer(lecturer);
};

// Download data absensi sebagai TXT
const downloadAttendance = () => {
  if (!recognizedLecturer) return;

  const now = new Date();

  const date = now.toLocaleDateString("id-ID");
  const time = now.toLocaleTimeString("id-ID");

  const content = `
================================
        DATA ABSENSI DOSEN
================================

Kode Dosen  : ${recognizedLecturer.lecturerId}
Nama        : ${recognizedLecturer.name}
Departemen  : ${recognizedLecturer.department}
Email       : ${recognizedLecturer.email}

Mata Kuliah : ${recognizedLecturer.course}
Kelas       : ${recognizedLecturer.className}
Ruangan     : ${recognizedLecturer.room}

Tanggal     : ${date}
Waktu       : ${time}
Status      : HADIR

================================
`;

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `Absensi_${recognizedLecturer.lecturerId}_${now.getTime()}.txt`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};


const drawFaces = (faces, width, height) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  faces.forEach((face) => {
    const boxWidth = face.x2 - face.x1;
    const boxHeight = face.y2 - face.y1;

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.strokeRect(face.x1, face.y1, boxWidth, boxHeight);

    // Gambar 5 facial landmarks
    face.landmarks.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);

      ctx.fillStyle = "red";
      ctx.fill();

      ctx.fillStyle = "yellow";
      ctx.font = "12px Arial";
      ctx.fillText(index + 1, point.x + 7, point.y);
    });

    ctx.fillStyle = "#22c55e";
    ctx.font = "18px Arial";
    ctx.fillText(
      `Face ${(face.score * 100).toFixed(0)}%`,
      face.x1,
      Math.max(20, face.y1 - 8)
    );
  });
};

//Testing ArcFace
const testArcFace = async () => {
  try {
    const session = arcFaceSessionRef.current;

    if (!session) {
      alert("Load ArcFace Model terlebih dahulu!");
      return;
    }

    // Ambil satu foto dari dataset D001
    const image = new Image();
    image.src = "/faces/D001/Dosen_1.jpeg";

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    // Resize gambar menjadi 112 x 112
    const canvas = document.createElement("canvas");
    canvas.width = 112;
    canvas.height = 112;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, 112, 112);

    const pixels = ctx.getImageData(0, 0, 112, 112).data;

    const inputData = new Float32Array(112 * 112 * 3);

    for (let i = 0; i < 112 * 112; i++) {
      inputData[i * 3] = (pixels[i * 4] - 127.5) / 128;
      inputData[i * 3 + 1] = (pixels[i * 4 + 1] - 127.5) / 128;
      inputData[i * 3 + 2] = (pixels[i * 4 + 2] - 127.5) / 128;
    }

    const tensor = new ort.Tensor(
      "float32",
      inputData,
      [1, 112, 112, 3]
    );

    const result = await session.run({
      [session.inputNames[0]]: tensor,
    });

    const output = result[session.outputNames[0]];
    const embedding = Array.from(output.data);

    // Normalisasi embedding
    const magnitude = Math.sqrt(
      embedding.reduce((sum, value) => sum + value * value, 0)
    );

    const normalizedEmbedding = embedding.map(
      (value) => value / magnitude
    );

    console.log("Jumlah embedding:", normalizedEmbedding.length);
    console.log("Contoh embedding:", normalizedEmbedding.slice(0, 10));

    alert(
      `Berhasil menghasilkan ${normalizedEmbedding.length} angka embedding!`
    );

  } catch (error) {
    console.error("Gagal menghasilkan embedding:", error);
    alert("Gagal memproses gambar. Periksa Console.");
  }
};


//Load Model Arcface
const loadArcFace = async () => {
  try {
    setArcFaceStatus("Sedang memuat ArcFace...");

    const session = await ort.InferenceSession.create(
      "/models/arc.onnx",
      {
        executionProviders: ["wasm"],
      }
    );

    arcFaceSessionRef.current = session;

    console.log("ArcFace berhasil dimuat!");
    console.log("Input names:", session.inputNames);
    console.log("Output names:", session.outputNames);

    setArcFaceStatus("ArcFace berhasil dimuat");
  } catch (error) {
    console.error("Gagal memuat ArcFace:", error);
    setArcFaceStatus("Gagal memuat ArcFace");
  }
};

  //Load Model  
const loadYOLO = async () => {
  try {
    setModelStatus("Sedang memuat model...");

    const session = await ort.InferenceSession.create(
      "/models/yolov8n-face.onnx",
      {
        executionProviders: ["wasm"],
      }
    );

    sessionRef.current = session;

    console.log("Model berhasil dimuat!");
    console.log("Input:", session.inputNames);
    console.log("Output:", session.outputNames);

    setModelStatus("Model YOLO berhasil dimuat");

  } catch (error) {
    console.error("Gagal memuat model:", error);
    setModelStatus("Gagal memuat model YOLO");
  }
};


  // Mengaktifkan kamera
  const startCamera = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

    } catch (err) {
      console.error(err);
      setError("Tidak dapat mengakses kamera. Periksa izin kamera browser.");
    }
  };

  // Mematikan kamera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  useEffect(() => {
  if (!cameraActive || !sessionRef.current) return;

  const interval = setInterval(() => {
    detectFaces();
  }, 200);

  return () => {
    clearInterval(interval);
  };
}, [cameraActive, modelStatus]);
  // Membersihkan kamera ketika halaman ditinggalkan
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Absensi Dosen
        </h2>

        <p className="text-gray-500 mt-1">
          Silakan lakukan pemindaian wajah untuk melakukan absensi.
        </p>
      </div>

      {/* Camera dan Identitas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg">
              Face Recognition Scanner
            </h3>

            <span className={`px-3 py-1 rounded-full text-xs ${
              cameraActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {cameraActive ? "Camera Active" : "Camera Inactive"}
            </span>
          </div>

          {/* Video Preview */}
          <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${
                cameraActive ? "block" : "hidden"
              }`}
            />

            <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
            {!cameraActive && (
              <div className="text-center text-white">
                <div className="text-5xl mb-4">📷</div>
                <p className="text-gray-300">
                  Camera preview will appear here
                </p>
              </div>
            )}

            {/* Scanner Overlay */}
            {cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                
              </div>
            )}

          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm mt-3">
              {error}
            </p>
          )}

          {/* Camera Controls */}
          <div className="flex gap-3 mt-5">

            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-medium"
              >
                Aktifkan Kamera
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-lg text-sm font-medium"
              >
                Matikan Kamera
              </button>
            )}

          </div>
        </div>
      </div>
      {/* Panel Identitas Dosen */}
<div className="bg-white rounded-xl shadow-sm p-6">

  <h3 className="font-bold text-lg mb-5">
    Identitas Dosen
  </h3>

  {!recognizedLecturer ? (
    <div className="text-center py-10">

      <div className="text-5xl mb-4">👤</div>

      <p className="font-medium text-gray-700">
        Belum Ada Dosen Terdeteksi
      </p>

      <p className="text-sm text-gray-500 mt-2">
        Silakan lakukan pemindaian wajah.
      </p>

    </div>
  ) : (
    <div className="space-y-4">

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">

        <p className="text-sm text-green-700 font-medium">
          Wajah Berhasil Dikenali
        </p>

        <h4 className="text-xl font-bold text-gray-800 mt-2">
          {recognizedLecturer.name}
        </h4>

        <p className="text-sm text-gray-600">
          {recognizedLecturer.lecturerId}
        </p>

      </div>

      <div>
        <p className="text-xs text-gray-500">Departemen</p>
        <p className="font-medium">
          {recognizedLecturer.department}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">Email</p>
        <p className="font-medium">
          {recognizedLecturer.email}
        </p>
      </div>

      <hr />

      <h4 className="font-bold">Informasi Perkuliahan</h4>

      <div>
        <p className="text-xs text-gray-500">Mata Kuliah</p>
        <p className="font-medium">
          {recognizedLecturer.course}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">Kelas</p>
        <p className="font-medium">
          {recognizedLecturer.className}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">Ruangan</p>
        <p className="font-medium">
          {recognizedLecturer.room}
        </p>
      </div>

      <hr />

      <button
        onClick={downloadAttendance}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
      >
        Download Absensi (.txt)
      </button>

      <button
        onClick={() => setRecognizedLecturer(null)}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium"
      >
        Reset Identitas
      </button>

    </div>
  )}

  {/* Tombol sementara untuk pengujian */}
  <button
    onClick={simulateRecognition}
    className="w-full mt-5 border border-blue-500 text-blue-600 hover:bg-blue-50 py-3 rounded-lg text-sm font-medium"
  >
    Simulasikan Pengenalan D001
  </button>

</div>

      
<div className="bg-white rounded-xl shadow-sm p-6 mt-6">

  <h3 className="font-bold text-lg mb-4">
    YOLO Face Detection
  </h3>

  <div className="flex items-center gap-3 mb-5">

    <div className={`w-3 h-3 rounded-full ${
      modelStatus === "Model YOLO berhasil dimuat"
        ? "bg-green-500"
        : "bg-yellow-500"
    }`} />

    <p className="text-sm text-gray-600">
      {modelStatus}
    </p>

  </div>

  <button
    onClick={loadYOLO}
    disabled={!!sessionRef.current}
    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-lg text-sm font-medium"
  >
    Load YOLO Model
  </button>

</div>

<div className="bg-white rounded-xl shadow-sm p-6 mt-6">
  <h3 className="text-lg font-bold mb-4">
    ArcFace Face Recognition
  </h3>

  <p className="text-sm text-gray-600 mb-4">
    Status: {arcFaceStatus}
  </p>

  <button
    onClick={loadArcFace}
    disabled={!!arcFaceSessionRef.current}
    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-lg"
  >
    Load ArcFace Model
  </button>
</div>

<button
  onClick={testArcFace}
  className="bg-green-600 text-white px-5 py-3 rounded-lg"
>
  Test Face Embedding
</button>



      {/* Recognition Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-lg mb-3">
          Recognition Information
        </h3>

        <p className="text-gray-500 text-sm">
          {cameraActive
            ? "Kamera berhasil diaktifkan. Sistem siap untuk tahap integrasi YOLO."
            : "Aktifkan kamera untuk memulai proses pemindaian wajah."
          }
        </p>
      </div>

    </div>
  );
}

export default Absensi;
