export interface DossierMedical {
  id: string;
  patientId: string;
  patientNom: string;
  patientPrenom: string;
  consultations: Consultation[];
  prescriptions: Prescription[];
  analyses: Analyse[];
  observations: Observation[];
}

export interface Consultation {
  id: string;
  date: Date;
  medecinId: string;
  medecinNom: string;
  motif: string;
  diagnostic: string;
  compteRendu: string;
  images: string[];
}

export interface Prescription {
  id: string;
  date: Date;
  medecinId: string;
  medecinNom: string;
  medicaments: string[];
  posologie: string;
  duree: string;
  remarques?: string;
}

export interface Analyse {
  id: string;
  date: Date;
  medecinId: string;
  medecinNom: string;
  type: string;
  resultats: string;
  image?: string;
}

export interface Observation {
  id: string;
  date: Date;
  professionnelId: string;
  professionnelNom: string;
  professionnelRole: string;
  contenu: string;
}

export interface CarnetSante {
  patientId: string;
  mesures: Mesure[];
  historiqueMedications: Medication[];
}

export interface Mesure {
  id: string;
  date: Date;
  tension?: string;
  poids?: number;
  glycemie?: number;
  temperature?: number;
  frequenceCardiaque?: number;
  ajoutePar: string;
  ajouteParNom: string;
  ajouteParRole: string;
}

export interface Medication {
  id: string;
  date: Date;
  medicament: string;
  dosage: string;
  heure?: string;
}

// Données fictives
let dossiersMedicauxDB: DossierMedical[] = [];
let carnetsSanteDB: CarnetSante[] = [];
let observers: (() => void)[] = [];

function notifier() { observers.forEach(cb => cb()); }

export const MedicalDataService = {
  // Dossier médical
  getDossierMedical: (patientId: string): DossierMedical | undefined => {
    let dossier = dossiersMedicauxDB.find(d => d.patientId === patientId);
    if (!dossier) {
      dossier = {
        id: Date.now().toString(),
        patientId,
        patientNom: '',
        patientPrenom: '',
        consultations: [],
        prescriptions: [],
        analyses: [],
        observations: [],
      };
      dossiersMedicauxDB.push(dossier);
    }
    return dossier;
  },

  ajouterConsultation: (patientId: string, consultation: Omit<Consultation, 'id'>): void => {
    const dossier = dossiersMedicauxDB.find(d => d.patientId === patientId);
    if (dossier) {
      const nouvelle: Consultation = { ...consultation, id: Date.now().toString() };
      dossier.consultations.push(nouvelle);
      notifier();
    }
  },

  ajouterPrescription: (patientId: string, prescription: Omit<Prescription, 'id'>): void => {
    const dossier = dossiersMedicauxDB.find(d => d.patientId === patientId);
    if (dossier) {
      const nouvelle: Prescription = { ...prescription, id: Date.now().toString() };
      dossier.prescriptions.push(nouvelle);
      notifier();
    }
  },

  ajouterAnalyse: (patientId: string, analyse: Omit<Analyse, 'id'>): void => {
    const dossier = dossiersMedicauxDB.find(d => d.patientId === patientId);
    if (dossier) {
      const nouvelle: Analyse = { ...analyse, id: Date.now().toString() };
      dossier.analyses.push(nouvelle);
      notifier();
    }
  },

  ajouterObservation: (patientId: string, observation: Omit<Observation, 'id'>): void => {
    const dossier = dossiersMedicauxDB.find(d => d.patientId === patientId);
    if (dossier) {
      const nouvelle: Observation = { ...observation, id: Date.now().toString() };
      dossier.observations.push(nouvelle);
      notifier();
    }
  },

  // Carnet de santé
  getCarnetSante: (patientId: string): CarnetSante => {
    let carnet = carnetsSanteDB.find(c => c.patientId === patientId);
    if (!carnet) {
      carnet = { patientId, mesures: [], historiqueMedications: [] };
      carnetsSanteDB.push(carnet);
    }
    return carnet;
  },

  ajouterMesure: (patientId: string, mesure: Omit<Mesure, 'id'>): void => {
    const carnet = carnetsSanteDB.find(c => c.patientId === patientId);
    if (carnet) {
      const nouvelle: Mesure = { ...mesure, id: Date.now().toString() };
      carnet.mesures.push(nouvelle);
      notifier();
    }
  },

  getMesuresParPatient: (patientId: string): Mesure[] => {
    const carnet = carnetsSanteDB.find(c => c.patientId === patientId);
    return carnet?.mesures || [];
  },

  subscribe: (callback: () => void) => {
    observers.push(callback);
    return () => { observers = observers.filter(obs => obs !== callback); };
  },
};