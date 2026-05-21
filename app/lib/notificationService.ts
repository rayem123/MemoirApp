import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';
import { Platform, Alert } from 'react-native';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let expoPushToken: string | null = null;

// Enregistrer le token de l'appareil
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token!');
    return null;
  }
  
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'votre-project-id',
    });
    expoPushToken = token.data;
    console.log('Expo Push Token:', expoPushToken);
    return expoPushToken;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

// Envoyer une notification push
export async function sendPushNotification(expoPushToken: string, title: string, body: string, data?: any) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data || {},
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// Fonction principale pour créer une notification
export async function createNotification(
  userId: string,
  titre: string,
  message: string,
  type: string,
  data?: any
) {
  try {
    // Sauvegarder en base de données
    const { error } = await supabase.from('notification').insert({
      utilisateur_id: userId,
      titre: titre,
      message: message,
      type: type,
      est_lue: false,
      data: data || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Erreur création notification DB:', error);
      return false;
    }

    // Envoyer notification push
    const { data: userData } = await supabase
      .from('utilisateur')
      .select('expo_push_token')
      .eq('id', userId)
      .single();

    if (userData?.expo_push_token) {
      await sendPushNotification(userData.expo_push_token, titre, message, data);
    }

    return true;
  } catch (error) {
    console.error('Erreur création notification:', error);
    return false;
  }
}

// Récupérer l'admin
export async function getAdminId(): Promise<string | null> {
  const { data } = await supabase
    .from('utilisateur')
    .select('id')
    .eq('role', 'admin')
    .single();
  return data?.id || null;
}

// ============ NOTIFICATIONS SPÉCIFIQUES ============

// 1. Stock faible
export async function notifyStockAlerte(materielId: string, nom: string, quantite: number) {
  const adminId = await getAdminId();
  if (!adminId) return;

  let titre = '';
  let message = '';
  let type = '';

  if (quantite === 0) {
    titre = `❌ Rupture de stock: ${nom}`;
    message = `Le matériel "${nom}" est en rupture de stock. Réapprovisionnez immédiatement.`;
    type = 'stock_rupture';
  } else if (quantite <= 3) {
    titre = `⚠️ Stock faible: ${nom}`;
    message = `Il ne reste que ${quantite} unité(s) de "${nom}". Veuillez réapprovisionner.`;
    type = 'stock_alerte';
  } else {
    return;
  }

  await createNotification(adminId, titre, message, type, { materiel_id: materielId, quantite });
}

// 2. Nouvelle demande patient
export async function notifyNouvelleDemande(intervention: any, patient: any) {
  const adminId = await getAdminId();
  if (!adminId) return;

  await createNotification(
    adminId,
    '📋 Nouvelle demande d\'intervention',
    `${patient.prenom} ${patient.nom} a fait une demande de ${intervention.type_intervention}.`,
    'nouvelle_demande',
    { intervention_id: intervention.id, patient_id: patient.id }
  );
}

// 3. Intervention orientée vers un pro
export async function notifyInterventionOrientee(intervention: any, patient: any, pro: any) {
  // Notification au professionnel
  await createNotification(
    pro.utilisateur_id,
    '🆕 Nouvelle intervention',
    `Intervention: ${intervention.type_intervention} chez ${patient.prenom} ${patient.nom} à ${intervention.localisation || patient.adresse}`,
    'intervention_orientee',
    { intervention_id: intervention.id }
  );

  // Notification au patient
  await createNotification(
    patient.id,
    '✅ Demande orientée',
    `Votre demande a été orientée vers ${pro.prenom} ${pro.nom}. Vous serez contacté prochainement.`,
    'orientation_patient',
    { intervention_id: intervention.id, professionnel_id: pro.id }
  );
}

// 4. Pro accepte l'intervention
export async function notifyProAccepte(intervention: any, patient: any, pro: any) {
  const adminId = await getAdminId();
  if (adminId) {
    await createNotification(
      adminId,
      '✅ Intervention acceptée',
      `${pro.prenom} ${pro.nom} a accepté l'intervention pour ${patient.prenom} ${patient.nom}.`,
      'intervention_acceptee',
      { intervention_id: intervention.id, professionnel_id: pro.id }
    );
  }

  await createNotification(
    patient.id,
    '✅ Intervention acceptée',
    `Votre intervention a été acceptée par ${pro.prenom} ${pro.nom}.`,
    'intervention_acceptee_patient',
    { intervention_id: intervention.id }
  );
}

// 5. Pro refuse l'intervention
export async function notifyProRefuse(intervention: any, patient: any, pro: any) {
  const adminId = await getAdminId();
  if (adminId) {
    await createNotification(
      adminId,
      '❌ Intervention refusée',
      `${pro.prenom} ${pro.nom} a refusé l'intervention pour ${patient.prenom} ${patient.nom}.`,
      'intervention_refusee',
      { intervention_id: intervention.id, professionnel_id: pro.id }
    );
  }

  await createNotification(
    patient.id,
    '❌ Intervention refusée',
    `Votre intervention a été refusée. Nous cherchons un autre professionnel pour vous prendre en charge.`,
    'intervention_refusee_patient',
    { intervention_id: intervention.id }
  );
}

// 6. Intervention terminée
export async function notifyInterventionTerminee(intervention: any, patient: any, pro: any) {
  const adminId = await getAdminId();
  if (adminId) {
    await createNotification(
      adminId,
      '✅ Intervention terminée',
      `L'intervention pour ${patient.prenom} ${patient.nom} (${intervention.type_intervention}) est terminée par ${pro.prenom} ${pro.nom}.`,
      'intervention_terminee',
      { intervention_id: intervention.id }
    );
  }

  await createNotification(
    patient.id,
      '✅ Intervention terminée',
      `Votre intervention est terminée. Vous pouvez consulter les résultats dans l'application.`,
      'intervention_terminee_patient',
      { intervention_id: intervention.id }
    );
  }

// 7. Matériel utilisé
export async function notifyMaterielUtilise(materiel: any, quantite: number, patient: any) {
  const adminId = await getAdminId();
  if (!adminId) return;

  await createNotification(
    adminId,
    '📦 Matériel utilisé',
    `${quantite}x "${materiel.nom_m}" utilisé pour l'intervention de ${patient.prenom} ${patient.nom}.`,
    'materiel_utilise',
    { materiel_id: materiel.id, quantite, patient_id: patient.id }
  );
}

// Vérification périodique des stocks
export async function checkAllStocks() {
  const { data: materiels, error } = await supabase
    .from('materiel_medical')
    .select('id, nom_m, quantite');

  if (error) {
    console.error('Erreur vérification stocks:', error);
    return;
  }

  for (const materiel of materiels) {
    await notifyStockAlerte(materiel.id, materiel.nom_m, materiel.quantite);
  }
}