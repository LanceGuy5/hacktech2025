import * as routes from './routes.js';

// temporary middleware storage for file uploads
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadm = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_, file, cb) => cb(null, file.originalname)
  })
});

export default function register_routes(app) {
  app.get('/api/hello', routes.getHelloWorld);
  app.get('/api/getNearbyHospitals', routes.getNearbyHospitals);
  app.get('/api/getHospitalById/:id', routes.getHospitalById);
  app.post('/api/generatePatientNeeds', routes.generatePatientNeeds);

  app.post('/api/postSymptoms', upload.single('photo'), routes.postSymptoms);
  app.post('/api/transcribeAudio', uploadm.single('audio'), routes.transcribeVoice);
}