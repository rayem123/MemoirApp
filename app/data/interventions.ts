export type Gravite = 'normale' | 'urgente' | 'critique';
export type Statut = 'en_attente' | 'affectee' | 'acceptee' | 'refusee' | 'en_cours' | 'terminee' | 'annulee';
export type TypeProfessionnel = 'medecin' | 'infirmier' | 'aide_soignant';

export interface DemandeIntervention {
  id: string;
  patientId: string;
  patientNom: string;
  patientPrenom: string;
  patientAdresse: string;
  patientTelephone: string;
  typeSoin: string;
  symptomes: string[];
  description: string;
  intensite: string;
  duree: string;
  gravite: Gravite;
  statut: Statut;
  dateDemande: Date;
  professionnelId?: string;
  professionnelNom?: string;
  professionnelType?: TypeProfessionnel;
  dateAffectation?: Date;
  dateAcceptation?: Date;
  dateRealisation?: Date;
  compteRendu?: string;
}

export interface PatientInfo {
  id: string;
  nom: string;
  prenom: string;
  adresse: string;
  telephone: string;
  derniereIntervention: Date;
  statut: string;
}

// Base de données locale simulée
let demandesDB: DemandeIntervention[] = [];

// Stocker les observateurs pour les mises à jour
let observers: (() => void)[] = [];

// Fonction pour calculer la gravité en fonction des symptômes et intensité
function calculerGravite(symptomes: string[], intensite: string): Gravite {
  const motsCritiques = ['cardiaque', 'thoracique', 'étouffement', 'hémorragie', 'inconscience', 'convulsion', 'AVC'];
  const motsUrgents = ['forte', 'très forte', 'douleur intense', 'vomissements', 'déshydratation', 'infection'];
  
  const texte = symptomes.join(' ').toLowerCase();
  
  for (const mot of motsCritiques) {
    if (texte.includes(mot)) {
      return 'critique';
    }
  }
  
  if (intensite === 'très forte' || intensite === 'forte') {
    return 'urgente';
  }
  
  for (const mot of motsUrgents) {
    if (texte.includes(mot)) {
      return 'urgente';
    }
  }
  
  return 'normale';
}

function notifierChangement() {
  observers.forEach(callback => callback());
}

export const InterventionService = {
  // Ajouter une demande
  ajouterDemande: (demande: Omit<DemandeIntervention, 'id' | 'gravite' | 'statut' | 'dateDemande'>): DemandeIntervention => {
    const gravite = calculerGravite(demande.symptomes, demande.intensite);
    
    const nouvelleDemande: DemandeIntervention = {
      ...demande,
      id: Date.now().toString(),
      gravite,
      statut: 'en_attente',
      dateDemande: new Date(),
    };
    
    demandesDB = [nouvelleDemande, ...demandesDB];
    notifierChangement();
    return nouvelleDemande;
  },
  
  // Récupérer toutes les demandes
  getDemandes: (): DemandeIntervention[] => {
    return [...demandesDB];
  },
  
  // Récupérer les demandes en attente (pour admin)
  getDemandesEnAttente: (): DemandeIntervention[] => {
    return demandesDB.filter(d => d.statut === 'en_attente');
  },
  
  // Récupérer les demandes par gravité
  getDemandesParGravite: (): { critique: DemandeIntervention[], urgente: DemandeIntervention[], normale: DemandeIntervention[] } => {
    return {
      critique: demandesDB.filter(d => d.gravite === 'critique' && d.statut === 'en_attente'),
      urgente: demandesDB.filter(d => d.gravite === 'urgente' && d.statut === 'en_attente'),
      normale: demandesDB.filter(d => d.gravite === 'normale' && d.statut === 'en_attente'),
    };
  },
  
  // Affecter un professionnel
  affecterProfessionnel: (demandeId: string, professionnelId: string, professionnelNom: string, professionnelType: TypeProfessionnel): void => {
    const index = demandesDB.findIndex(d => d.id === demandeId);
    if (index !== -1) {
      demandesDB[index] = {
        ...demandesDB[index],
        statut: 'affectee',
        professionnelId,
        professionnelNom,
        professionnelType,
        dateAffectation: new Date(),
      };
      notifierChangement();
      console.log(`📱 Notification envoyée à ${professionnelNom}: Nouvelle intervention #${demandeId}`);
    }
  },
  
  // Professionnel accepte
  accepterIntervention: (demandeId: string): void => {
    const index = demandesDB.findIndex(d => d.id === demandeId);
    if (index !== -1) {
      demandesDB[index] = {
        ...demandesDB[index],
        statut: 'acceptee',
        dateAcceptation: new Date(),
      };
      notifierChangement();
    }
  },
  
  // Professionnel refuse
  refuserIntervention: (demandeId: string): void => {
    const index = demandesDB.findIndex(d => d.id === demandeId);
    if (index !== -1) {
      demandesDB[index] = {
        ...demandesDB[index],
        statut: 'refusee',
      };
      notifierChangement();
    }
  },
  
  // Démarrer l'intervention
  demarrerIntervention: (demandeId: string): void => {
    const index = demandesDB.findIndex(d => d.id === demandeId);
    if (index !== -1) {
      demandesDB[index] = {
        ...demandesDB[index],
        statut: 'en_cours',
      };
      notifierChangement();
    }
  },
  
  // Terminer l'intervention
  terminerIntervention: (demandeId: string, compteRendu: string): void => {
    const index = demandesDB.findIndex(d => d.id === demandeId);
    if (index !== -1) {
      demandesDB[index] = {
        ...demandesDB[index],
        statut: 'terminee',
        dateRealisation: new Date(),
        compteRendu,
      };
      notifierChangement();
    }
  },
  
  // Récupérer les interventions d'un professionnel
  getInterventionsParProfessionnel: (professionnelId: string): DemandeIntervention[] => {
    return demandesDB.filter(d => d.professionnelId === professionnelId);
  },
  
  // Récupérer les interventions avec statut pour admin
  getToutesInterventions: (): DemandeIntervention[] => {
    return [...demandesDB];
  },
  
  // Récupérer les patients d'un professionnel (ceux qui ont accepté ses interventions)
  getPatientsByProfessionnel: (professionnelId: string): PatientInfo[] => {
    const interventionsAcceptees = demandesDB.filter(d => 
      d.professionnelId === professionnelId && 
      (d.statut === 'acceptee' || d.statut === 'en_cours' || d.statut === 'terminee')
    );
    
    const patientsMap = new Map<string, PatientInfo>();
    interventionsAcceptees.forEach(i => {
      if (!patientsMap.has(i.patientId)) {
        patientsMap.set(i.patientId, {
          id: i.patientId,
          nom: i.patientNom,
          prenom: i.patientPrenom,
          adresse: i.patientAdresse,
          telephone: i.patientTelephone,
          derniereIntervention: i.dateDemande,
          statut: i.statut
        });
      }
    });
    return Array.from(patientsMap.values());
  },
  
  // S'abonner aux changements
  subscribe: (callback: () => void) => {
    observers.push(callback);
    return () => {
      observers = observers.filter(obs => obs !== callback);
    };
  },
};