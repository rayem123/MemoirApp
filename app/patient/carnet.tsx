import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenWidth = Dimensions.get('window').width - 40;

type Mesure = {
  id: string;
  valeur: number;
  date_mesure: string;
  heure_mesure: string;
  note: string;
  type_mesure: {
    id: string;
    nom: string;
    unite: string;
    couleur: string;
  };
};

type TypeMesure = {
  id: string;
  nom: string;
  unite: string;
  couleur: string;
};

export default function CarnetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [typesMesure, setTypesMesure] = useState<TypeMesure[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [newValeur, setNewValeur] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [newHeure, setNewHeure] = useState(new Date());
  const [newNote, setNewNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTypesMesure();
    loadMesures();
  }, []);

  const loadTypesMesure = async () => {
    const { data, error } = await supabase
      .from('type_mesure')
      .select('*')
      .order('nom');
    
    if (!error && data) {
      setTypesMesure(data);
      if (data.length > 0 && !selectedType) {
        setSelectedType(data[0].nom);
      }
    }
  };

  const loadMesures = async () => {
    setLoading(true);
    
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select('id')
      .eq('utilisateur_id', user?.id)
      .single();

    if (patientError) {
      console.error('Erreur patient:', patientError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('mesure_sante')
      .select(`
        id,
        valeur,
        date_mesure,
        heure_mesure,
        note,
        type_mesure:type_mesure_id (id, nom, unite, couleur)
      `)
      .eq('patient_id', patient.id)
      .order('date_mesure', { ascending: true })
      .order('heure_mesure', { ascending: true });

    if (!error && data) {
      setMesures(data);
    }
    
    setLoading(false);
  };

  const addMeasure = async () => {
    if (!newValeur) {
      Alert.alert('Erreur', 'Veuillez saisir une valeur');
      return;
    }

    setSaving(true);

    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select('id')
      .eq('utilisateur_id', user?.id)
      .single();

    if (patientError) {
      Alert.alert('Erreur', patientError.message);
      setSaving(false);
      return;
    }

    const type = typesMesure.find(t => t.nom === selectedType);
    if (!type) {
      Alert.alert('Erreur', 'Type de mesure non trouvé');
      setSaving(false);
      return;
    }

    const dateStr = newDate.toISOString().split('T')[0];
    const heureStr = newHeure.toTimeString().split(' ')[0];

    const { error } = await supabase
      .from('mesure_sante')
      .insert({
        patient_id: patient.id,
        type_mesure_id: type.id,
        valeur: parseFloat(newValeur),
        date_mesure: dateStr,
        heure_mesure: heureStr,
        note: newNote || null
      });

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Mesure ajoutée');
      setModalVisible(false);
      setNewValeur('');
      setNewNote('');
      setNewDate(new Date());
      setNewHeure(new Date());
      loadMesures();
    }
    setSaving(false);
  };

  // ✅ Graphique avec plusieurs courbes (chaque type sa couleur)
  const getChartData = () => {
    if (mesures.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    // Trier par date
    const sortedMeasures = [...mesures].sort((a, b) => {
      return new Date(a.date_mesure).getTime() - new Date(b.date_mesure).getTime();
    });
    
    // Labels des dates
    const labels = sortedMeasures.map(m => {
      const date = new Date(m.date_mesure);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    // Grouper par type de mesure
    const mesuresParType: { [key: string]: { data: number[]; color: string; unite: string } } = {};
    
    sortedMeasures.forEach(m => {
      const typeNom = m.type_mesure?.nom || 'autre';
      if (!mesuresParType[typeNom]) {
        mesuresParType[typeNom] = {
          data: [],
          color: m.type_mesure?.couleur || '#844567',
          unite: m.type_mesure?.unite || ''
        };
      }
      mesuresParType[typeNom].data.push(m.valeur);
    });
    
    // Créer les datasets pour le graphique
    const datasets = Object.keys(mesuresParType).map(typeNom => ({
      data: mesuresParType[typeNom].data.slice(-20),
      color: (opacity = 1) => mesuresParType[typeNom].color,
      strokeWidth: 2,
    }));
    
    return { 
      labels: labels.slice(-20), 
      datasets, 
      typesMap: mesuresParType 
    };
  };

  const chartDataResult = getChartData();
  const hasData = chartDataResult.labels && chartDataResult.labels.length > 0;

  // Calculer les valeurs min et max pour l'axe Y
  const allValues = mesures.map(m => m.valeur);
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100;

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
    },
    formatYLabel: (value) => value.toString(),
    yAxisMin: 0,
    yAxisMax: maxValue + (maxValue * 0.1),
  };

  // TOUTES les mesures dans le tableau
  const toutesLesMesures = [...mesures].reverse();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>Carnet de santé</Text>

        {/* Graphique avec plusieurs courbes (chaque type sa couleur) */}
        {hasData ? (
          <>
            <Text style={[styles.chartLabel, { color: colors.text }]}>
              📊 Évolution des mesures par type
            </Text>
            <LineChart
              data={{
                labels: chartDataResult.labels,
                datasets: chartDataResult.datasets,
              }}
              width={screenWidth}
              height={280}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              fromZero={true}
            />
            
            {/* Légende des couleurs */}
            <View style={styles.legendContainer}>
              {Object.keys(chartDataResult.typesMap).map((typeNom, idx) => {
                const typeInfo = chartDataResult.typesMap[typeNom];
                return (
                  <View key={idx} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: typeInfo.color }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                      {typeNom} ({typeInfo.unite})
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune mesure enregistrée
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              Utilisez le bouton "+" pour ajouter votre première mesure
            </Text>
          </View>
        )}

        {/* Historique complet */}
        <Text style={[styles.subtitle, { color: colors.primary }]}>
          📋 Historique complet ({toutesLesMesures.length} mesure(s))
        </Text>
        
        {toutesLesMesures.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune mesure enregistrée</Text>
        ) : (
          toutesLesMesures.map(m => {
            const dateObj = new Date(m.date_mesure);
            const dateFormatee = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
            const heureFormatee = m.heure_mesure ? m.heure_mesure.slice(0,5) : '00:00';
            
            return (
              <View key={m.id} style={[styles.mesureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.mesureHeader}>
                  <Text style={[styles.mesureType, { color: m.type_mesure?.couleur || colors.primary }]}>
                    {m.type_mesure?.nom || 'Mesure'} • {m.valeur} {m.type_mesure?.unite || ''}
                  </Text>
                  <Text style={[styles.mesureDate, { color: colors.textSecondary }]}>
                    {dateFormatee} à {heureFormatee}
                  </Text>
                </View>
                {m.note && <Text style={[styles.mesureNote, { color: colors.textSecondary }]}>📝 {m.note}</Text>}
              </View>
            );
          })
        )}

        {/* Bouton ajouter */}
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Ajouter une mesure</Text>
        </TouchableOpacity>
      </View>

      {/* Modal d'ajout de mesure */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Ajouter une mesure</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Type de mesure</Text>
            <View style={styles.modalTypeContainer}>
              {typesMesure.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.modalTypeButton,
                    selectedType === type.nom && { backgroundColor: type.couleur }
                  ]}
                  onPress={() => setSelectedType(type.nom)}
                >
                  <Text style={[styles.modalTypeText, { color: selectedType === type.nom ? '#fff' : colors.text }]}>
                    {type.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Valeur ({typesMesure.find(t => t.nom === selectedType)?.unite || ''})
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Ex: 12.5"
              placeholderTextColor={colors.textSecondary}
              value={newValeur}
              onChangeText={setNewValeur}
              keyboardType="numeric"
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Date</Text>
            <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: colors.text }}>{newDate.toLocaleDateString()}</Text>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Heure</Text>
            <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowTimePicker(true)}>
              <Text style={{ color: colors.text }}>{newHeure.toLocaleTimeString().slice(0,5)}</Text>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Note (optionnel)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Ajouter une note..."
              placeholderTextColor={colors.textSecondary}
              value={newNote}
              onChangeText={setNewNote}
              multiline
            />

            <TouchableOpacity style={[styles.modalSaveButton, { backgroundColor: colors.primary }]} onPress={addMeasure} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={newDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setNewDate(selectedDate);
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={newHeure}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) setNewHeure(selectedTime);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', marginTop: 10 },
  chartLabel: { fontSize: 14, fontWeight: '500', marginBottom: 10, marginTop: 10, textAlign: 'center' },
  chart: { marginVertical: 8, borderRadius: 16 },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 10, gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendColor: { width: 16, height: 16, borderRadius: 8 },
  legendText: { fontSize: 12 },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 15 },
  mesureCard: { borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1 },
  mesureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  mesureType: { fontSize: 14, fontWeight: '600' },
  mesureDate: { fontSize: 12 },
  mesureNote: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 20, marginBottom: 30, gap: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 20 },
  emptySubText: { textAlign: 'center', marginTop: 8, fontSize: 12 },
  noDataContainer: { alignItems: 'center', paddingVertical: 60 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalLabel: { fontSize: 14, fontWeight: '500', marginBottom: 5, marginTop: 10 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10 },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  modalTypeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  modalTypeButton: { flex: 1, minWidth: '30%', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  modalTypeText: { fontSize: 14 },
  dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  modalSaveButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  modalSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});