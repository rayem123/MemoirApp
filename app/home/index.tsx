import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Animated, RefreshControl, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();
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

  const loadUserLikes = async (userId: string) => {
    const { data } = await supabase
      .from('like_publication')
      .select('publication_id')
      .eq('utilisateur_id', userId);
    
    if (data) {
      setUserLikes(new Set(data.map(l => l.publication_id)));
    }
    return data || [];
  };

  const getCommentCount = async (publicationId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('commentaire')
      .select('*', { count: 'exact', head: true })
      .eq('publication_id', publicationId);
    
    if (error) {
      return 0;
    }
    return count || 0;
  };

  const getLikeCount = async (publicationId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('like_publication')
      .select('*', { count: 'exact', head: true })
      .eq('publication_id', publicationId);
    
    if (error) {
      return 0;
    }
    return count || 0;
  };

  const loadPublications = async () => {
    setLoading(true);
    
    try {
      const { data: publicationsData, error: pubError } = await supabase
        .from('publication')
        .select('*')
        .order('created_at', { ascending: false });

      if (pubError) throw pubError;

      if (!publicationsData || publicationsData.length === 0) {
        setPublications([]);
        setLoading(false);
        return;
      }

      const publicationsWithDetails = await Promise.all(
        publicationsData.map(async (pub) => {
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

          const realLikeCount = await getLikeCount(pub.id);
          const realCommentCount = await getCommentCount(pub.id);

          return {
            ...pub,
            likes_count: realLikeCount,
            commentaires_count: realCommentCount,
            utilisateur: userInfo || { nom: 'Inconnu', prenom: '', role: 'unknown', photo_url: null }
          };
        })
      );

      let userLikesData: any[] = [];
      if (user) {
        userLikesData = await loadUserLikes(user.id);
      }

      const publicationsWithLikes = publicationsWithDetails.map(pub => ({
        ...pub,
        user_liked: userLikesData.some(like => like.publication_id === pub.id),
      }));

      setPublications(publicationsWithLikes);
      
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentaires = async (publicationId: string) => {
    setLoadingComments(true);
    
    try {
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

      if (error) throw error;

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
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoadingComments(false);
    }
  };

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

    const newCount = await getCommentCount(selectedPublicationId);
    
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
        const newLikesCount = await getLikeCount(publicationId);
        
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
        const newLikesCount = await getLikeCount(publicationId);
        
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
      loadPublications();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPublications();
    setRefreshing(false);
  };

  const getInitials = (prenom: string, nom: string) => {
    return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`;
  };

  const getAuthorColor = (role: string) => {
    if (role === 'admin') return colors.primary;
    if (role === 'medecin') return '#5aadbf';
    if (role === 'infirmier') return '#5aadbf';
    if (role === 'aide_soignant') return '#ff8800';
    return colors.primary;
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

  // Vérifier si une URL est en Base64
  const isBase64Image = (url: string) => {
    return url && url.startsWith('data:image');
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          {user?.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials(user?.prenom, user?.nom)}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Bonjour,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.prenom} {user?.nom}</Text>
            <Text style={[styles.userRole, { color: colors.primary }]}>{getRoleLabel(role || '')}</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={[styles.feedTitle, { color: colors.primary }]}>Fil d'actualité</Text>

        {publications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune publication pour le moment</Text>
          </View>
        ) : (
          publications.map((pub) => (
            <View key={pub.id} style={[styles.postCard, { backgroundColor: colors.surface }]}>
              <View style={styles.postHeader}>
                <View style={[styles.postAvatar, { backgroundColor: getAuthorColor(pub.utilisateur?.role || '') }]}>
                  <Text style={styles.postAvatarText}>{getInitials(pub.utilisateur?.prenom, pub.utilisateur?.nom)}</Text>
                </View>
                <View style={styles.postHeaderInfo}>
                  <Text style={[styles.postAuthor, { color: colors.text }]}>{pub.utilisateur?.prenom} {pub.utilisateur?.nom}</Text>
                  <Text style={[styles.postRole, { color: colors.textSecondary }]}>{getRoleLabel(pub.utilisateur?.role || '')}</Text>
                  <Text style={[styles.postDate, { color: colors.textSecondary }]}>{formatDate(pub.created_at)}</Text>
                </View>
              </View>

              <Text style={[styles.postContent, { color: colors.text }]}>{pub.contenu}</Text>
              
              {/* Affichage de l'image - support Base64 et URL */}
              {pub.image_url && (
                <Image 
                  source={{ uri: pub.image_url }} 
                  style={styles.postImage}
                  resizeMode="cover"
                  onError={(e) => console.log('Erreur chargement image:', e.nativeEvent.error)}
                />
              )}

              <View style={[styles.postActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(pub.id)}>
                  <Ionicons 
                    name={pub.user_liked ? 'heart' : 'heart-outline'} 
                    size={22} 
                    color={pub.user_liked ? '#ff4444' : colors.primary} 
                  />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                    {pub.likes_count} j'aime
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} onPress={() => openCommentsModal(pub.id)}>
                  <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>{pub.commentaires_count} commentaires</Text>
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
            style={[styles.fabButton, { backgroundColor: colors.primary }]} 
            onPress={() => router.push('/home/add-post')}
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Commentaires</Text>
              <TouchableOpacity onPress={() => {
                setShowCommentsModal(false);
                setNewCommentText('');
              }}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={commentaires}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.commentItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.commentAvatar, { backgroundColor: getAuthorColor(item.utilisateur?.role || '') }]}>
                      <Text style={styles.commentAvatarText}>
                        {getInitials(item.utilisateur?.prenom, item.utilisateur?.nom)}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={[styles.commentAuthor, { color: colors.text }]}>
                          {item.utilisateur?.prenom} {item.utilisateur?.nom}
                        </Text>
                        <Text style={[styles.commentRole, { color: colors.primary }]}>
                          {getRoleLabel(item.utilisateur?.role || '')}
                        </Text>
                      </View>
                      <Text style={[styles.commentText, { color: colors.text }]}>{item.contenu}</Text>
                      <Text style={[styles.commentDate, { color: colors.textSecondary }]}>{formatCommentDate(item.created_at)}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={[styles.noCommentsText, { color: colors.textSecondary }]}>Aucun commentaire pour l'instant</Text>
                }
              />
            )}

            <View style={[styles.addCommentSection, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.modalCommentInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                placeholder="Écrire un commentaire..."
                placeholderTextColor={colors.textSecondary}
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
              />
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleAddCommentInModal}
              >
                <Ionicons name="send" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 14 },
  userName: { fontSize: 18, fontWeight: 'bold' },
  userRole: { fontSize: 12, marginTop: 2 },
  feed: { flex: 1 },
  feedContent: { padding: 16 },
  feedTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  postCard: { borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  postAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  postHeaderInfo: { flex: 1 },
  postAuthor: { fontSize: 14, fontWeight: '600' },
  postRole: { fontSize: 11, marginTop: 1 },
  postDate: { fontSize: 11, marginTop: 2 },
  postContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  postImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, backgroundColor: '#f0f0f0' },
  postActions: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { marginLeft: 6, fontSize: 14 },
  fabContainer: { position: 'absolute', right: 20 },
  fabButton: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  commentsLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  commentItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  commentAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  commentAuthor: { fontSize: 14, fontWeight: '600', marginRight: 8 },
  commentRole: { fontSize: 11 },
  commentText: { fontSize: 14, marginBottom: 4 },
  commentDate: { fontSize: 10 },
  noCommentsText: { textAlign: 'center', paddingVertical: 40 },
  addCommentSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  modalCommentInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, marginRight: 8, maxHeight: 80 },
  sendButton: { padding: 8 },
});