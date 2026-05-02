import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, RefreshControl, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Publication {
  id: string;
  contenu: string;
  image_url: string | null;
  likes_count: number;
  commentaires_count: number;
  created_at: string;
  professionnel_id: string;
  utilisateur?: {
    nom: string;
    prenom: string;
    role: string;
    photo_url: string | null;
  };
  user_liked?: boolean;
}

interface Commentaire {
  id: string;
  contenu: string;
  created_at: string;
  utilisateur: {
    id: string;
    nom: string;
    prenom: string;
    role: string;
    photo_url: string | null;
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [selectedPublicationId, setSelectedPublicationId] = useState<string | null>(null);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const fabBottom = scrollY.interpolate({
    inputRange: [0, 100, 200],
    outputRange: [80, 30, 20],
    extrapolate: 'clamp',
  });

  const canAddPost = role === 'medecin' || role === 'infirmier' || role === 'aide_soignant' || role === 'admin';

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabase
          .from('utilisateur')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(userData);
        setRole(userData?.role || null);
      }
    };
    getUser();
  }, []);

  // Charger les likes de l'utilisateur
  const loadUserLikes = async (userId: string) => {
    const { data } = await supabase
      .from('like_publication')
      .select('publication_id')
      .eq('utilisateur_id', userId);
    
    if (data) {
      setUserLikes(new Set(data.map(l => l.publication_id)));
    }
  };

  // ✅ Synchroniser le compteur de commentaires pour une publication
  const syncCommentCount = async (publicationId: string) => {
    const { count } = await supabase
      .from('commentaire')
      .select('*', { count: 'exact', head: true })
      .eq('publication_id', publicationId);

    if (count !== null) {
      await supabase
        .from('publication')
        .update({ commentaires_count: count })
        .eq('id', publicationId);
      return count;
    }
    return 0;
  };

  // ✅ Synchroniser le compteur de likes pour une publication
  const syncLikeCount = async (publicationId: string) => {
    const { count } = await supabase
      .from('like_publication')
      .select('*', { count: 'exact', head: true })
      .eq('publication_id', publicationId);

    if (count !== null) {
      await supabase
        .from('publication')
        .update({ likes_count: count })
        .eq('id', publicationId);
      return count;
    }
    return 0;
  };

  // ✅ Synchroniser tous les compteurs au chargement
  const syncAllCounters = async () => {
    const { data: publicationsData } = await supabase
      .from('publication')
      .select('id');

    if (publicationsData) {
      for (const pub of publicationsData) {
        await syncCommentCount(pub.id);
        await syncLikeCount(pub.id);
      }
    }
  };

  // Charger les publications
  const loadPublications = async () => {
    setLoading(true);
    
    // Synchroniser les compteurs avant de charger
    await syncAllCounters();
    
    const { data: publicationsData, error: pubError } = await supabase
      .from('publication')
      .select('*')
      .order('created_at', { ascending: false });

    if (pubError) {
      console.log('Erreur chargement publications:', pubError);
      setLoading(false);
      return;
    }

    const publicationsWithUsers = await Promise.all(
      (publicationsData || []).map(async (pub) => {
        let userInfo = null;
        
        if (pub.professionnel_id) {
          const { data: proData } = await supabase
            .from('professionnel_sante')
            .select('utilisateur_id')
            .eq('id', pub.professionnel_id)
            .single();
          
          if (proData?.utilisateur_id) {
            const { data: userData } = await supabase
              .from('utilisateur')
              .select('nom, prenom, role, photo_url')
              .eq('id', proData.utilisateur_id)
              .single();
            userInfo = userData;
          }
        }
        
        return {
          ...pub,
          utilisateur: userInfo || { nom: 'Inconnu', prenom: '', role: 'unknown', photo_url: null }
        };
      })
    );

    const publicationsWithLikes = publicationsWithUsers.map(pub => ({
      ...pub,
      user_liked: userLikes.has(pub.id),
    }));

    setPublications(publicationsWithLikes);
    setLoading(false);
  };

  const loadCommentaires = async (publicationId: string) => {
    setLoadingComments(true);
    
    const { data, error } = await supabase
      .from('commentaire')
      .select(`
        id,
        contenu,
        commentaire,
        ecrire_en,
        utilisateur_id
      `)
      .eq('publication_id', publicationId)
      .order('ecrire_en', { ascending: true });

    if (error) {
      console.error('Erreur chargement commentaires:', error);
      setLoadingComments(false);
      return;
    }

    const commentairesWithUsers = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: userData } = await supabase
          .from('utilisateur')
          .select('id, nom, prenom, role, photo_url')
          .eq('id', comment.utilisateur_id)
          .single();
        
        return {
          id: comment.id,
          contenu: comment.contenu || comment.commentaire || '',
          created_at: comment.ecrire_en,
          utilisateur: userData || { id: '', nom: 'Inconnu', prenom: '', role: '', photo_url: null }
        };
      })
    );

    setCommentaires(commentairesWithUsers);
    setLoadingComments(false);
  };

  // ✅ Ajouter un commentaire avec mise à jour automatique
  const handleAddCommentInModal = async () => {
    if (!newCommentText.trim() || !selectedPublicationId || !user) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire');
      return;
    }

    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('commentaire')
      .insert({
        publication_id: selectedPublicationId,
        utilisateur_id: user.id,
        contenu: newCommentText.trim(),
        commentaire: newCommentText.trim(),
        ecrire_en: now
      });

    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }

    // Synchroniser le compteur après ajout
    const newCount = await syncCommentCount(selectedPublicationId);
    
    // Mettre à jour l'état local
    setPublications(prev =>
      prev.map(p =>
        p.id === selectedPublicationId
          ? { ...p, commentaires_count: newCount }
          : p
      )
    );
    
    setNewCommentText('');
    await loadCommentaires(selectedPublicationId);
  };

  // ✅ Gérer les likes avec mise à jour automatique
  const handleLike = async (publicationId: string) => {
    if (!user) return;

    const hasLiked = userLikes.has(publicationId);

    if (hasLiked) {
      const { error } = await supabase
        .from('like_publication')
        .delete()
        .eq('publication_id', publicationId)
        .eq('utilisateur_id', user.id);

      if (!error) {
        const newLikesCount = await syncLikeCount(publicationId);
        
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(publicationId);
          return newSet;
        });
        
        setPublications(prev =>
          prev.map(p =>
            p.id === publicationId
              ? { ...p, likes_count: newLikesCount, user_liked: false }
              : p
          )
        );
      }
    } else {
      const { error } = await supabase
        .from('like_publication')
        .insert({
          publication_id: publicationId,
          utilisateur_id: user.id,
        });

      if (!error) {
        const newLikesCount = await syncLikeCount(publicationId);
        
        setUserLikes(prev => new Set([...prev, publicationId]));
        
        setPublications(prev =>
          prev.map(p =>
            p.id === publicationId
              ? { ...p, likes_count: newLikesCount, user_liked: true }
              : p
          )
        );
      }
    }
  };

  const openCommentsModal = async (publicationId: string) => {
    setSelectedPublicationId(publicationId);
    setShowCommentsModal(true);
    await loadCommentaires(publicationId);
  };

  useEffect(() => {
    if (user) {
      loadUserLikes(user.id);
      loadPublications();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) await loadUserLikes(user.id);
    await loadPublications();
    setRefreshing(false);
  };

  const getInitials = (prenom: string, nom: string) => {
    return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`;
  };

  const getAuthorColor = (role: string) => {
    if (role === 'admin') return '#844567';
    if (role === 'medecin') return '#5aadbf';
    if (role === 'infirmier') return '#5aadbf';
    if (role === 'aide_soignant') return '#ff8800';
    return '#844567';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Administrateur';
    if (role === 'medecin') return 'Médecin';
    if (role === 'infirmier') return 'Infirmier';
    if (role === 'aide_soignant') return 'Aide-soignant';
    return 'Patient';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#844567" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {user?.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{getInitials(user?.prenom, user?.nom)}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{user?.prenom} {user?.nom}</Text>
            <Text style={styles.userRole}>{getRoleLabel(role || '')}</Text>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        style={styles.feed}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#844567']} />
        }
      >
        <Text style={styles.feedTitle}>Fil d'actualité</Text>

        {publications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucune publication pour le moment</Text>
          </View>
        ) : (
          publications.map((pub) => (
            <View key={pub.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={[styles.postAvatar, { backgroundColor: getAuthorColor(pub.utilisateur?.role || '') }]}>
                  <Text style={styles.postAvatarText}>{getInitials(pub.utilisateur?.prenom, pub.utilisateur?.nom)}</Text>
                </View>
                <View style={styles.postHeaderInfo}>
                  <Text style={styles.postAuthor}>{pub.utilisateur?.prenom} {pub.utilisateur?.nom}</Text>
                  <Text style={styles.postRole}>{getRoleLabel(pub.utilisateur?.role || '')}</Text>
                  <Text style={styles.postDate}>{formatDate(pub.created_at)}</Text>
                </View>
              </View>

              <Text style={styles.postContent}>{pub.contenu}</Text>
              {pub.image_url && (
                <Image source={{ uri: pub.image_url }} style={styles.postImage} />
              )}

              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(pub.id)}>
                  <Ionicons 
                    name={pub.user_liked ? 'heart' : 'heart-outline'} 
                    size={22} 
                    color={pub.user_liked ? '#ff4444' : '#844567'} 
                  />
                  <Text style={[styles.actionText, pub.user_liked && styles.actionTextLiked]}>
                    {pub.likes_count} j'aime
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} onPress={() => openCommentsModal(pub.id)}>
                  <Ionicons name="chatbubble-outline" size={22} color="#844567" />
                  <Text style={styles.actionText}>{pub.commentaires_count} commentaires</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        
        <View style={{ height: 80 }} />
      </Animated.ScrollView>

      {canAddPost && (
        <Animated.View style={[styles.fabContainer, { bottom: fabBottom }]}>
          <TouchableOpacity 
            style={styles.fabButton} 
            onPress={() => router.push('home/add-post')}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCommentsModal(false);
          setNewCommentText('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Commentaires</Text>
              <TouchableOpacity onPress={() => {
                setShowCommentsModal(false);
                setNewCommentText('');
              }}>
                <Ionicons name="close" size={24} color="#844567" />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="large" color="#844567" />
              </View>
            ) : (
              <FlatList
                data={commentaires}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={[styles.commentAvatar, { backgroundColor: getAuthorColor(item.utilisateur?.role || '') }]}>
                      <Text style={styles.commentAvatarText}>
                        {getInitials(item.utilisateur?.prenom, item.utilisateur?.nom)}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                          {item.utilisateur?.prenom} {item.utilisateur?.nom}
                        </Text>
                        <Text style={styles.commentRole}>
                          {getRoleLabel(item.utilisateur?.role || '')}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{item.contenu}</Text>
                      <Text style={styles.commentDate}>{formatCommentDate(item.created_at)}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.noCommentsText}>Aucun commentaire pour l'instant</Text>
                }
              />
            )}

            <View style={styles.addCommentSection}>
              <TextInput
                style={styles.modalCommentInput}
                placeholder="Écrire un commentaire..."
                placeholderTextColor="#999"
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
              />
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleAddCommentInModal}
                disabled={!newCommentText.trim()}
              >
                <Ionicons name="send" size={24} color={newCommentText.trim() ? '#5aadbf' : '#ccc'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { backgroundColor: '#844567', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 14, color: '#666' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  userRole: { fontSize: 12, color: '#5aadbf', marginTop: 2 },
  feed: { flex: 1 },
  feedContent: { padding: 16 },
  feedTitle: { fontSize: 18, fontWeight: 'bold', color: '#844567', marginBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#999', textAlign: 'center' },
  postCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  postAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  postHeaderInfo: { flex: 1 },
  postAuthor: { fontSize: 14, fontWeight: '600', color: '#333' },
  postRole: { fontSize: 11, color: '#999', marginTop: 1 },
  postDate: { fontSize: 11, color: '#999', marginTop: 2 },
  postContent: { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 12 },
  postImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: '#f0f0f0' },
  postActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { marginLeft: 6, fontSize: 14, color: '#666' },
  actionTextLiked: { color: '#ff4444' },
  fabContainer: { position: 'absolute', right: 20 },
  fabButton: { backgroundColor: '#844567', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#844567' },
  commentsLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  commentItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  commentAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  commentAuthor: { fontSize: 14, fontWeight: '600', color: '#333', marginRight: 8 },
  commentRole: { fontSize: 11, color: '#5aadbf' },
  commentText: { fontSize: 14, color: '#333', marginBottom: 4 },
  commentDate: { fontSize: 10, color: '#999' },
  noCommentsText: { textAlign: 'center', color: '#999', paddingVertical: 40 },
  addCommentSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  modalCommentInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, marginRight: 8, maxHeight: 80 },
  sendButton: { padding: 8 },
});