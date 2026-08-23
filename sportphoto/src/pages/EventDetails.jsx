import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function EventDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [user, setUser] = useState(null)
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(null)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadEvent()
  }, [id])

  async function loadEvent() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        navigate('/login')
        return
      }

      setUser(user)

      const { data: eventData, error: eventError } =
        await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .eq('photographer_id', user.id)
          .single()

      if (eventError) throw eventError

      setEvent(eventData)

      const { data: photoData, error: photoError } =
        await supabase
          .from('photos')
          .select('*')
          .eq('event_id', id)
          .order('created_at', {
            ascending: false,
          })

      if (photoError) throw photoError

      const photosWithUrls = await Promise.all(
        (photoData || []).map(async (photo) => {
          if (!photo.file_path) {
            return {
              ...photo,
              url: null,
            }
          }

          const { data } = await supabase.storage
            .from('event-photos')
            .createSignedUrl(
              photo.file_path,
              3600
            )

          return {
            ...photo,
            url: data?.signedUrl || null,
          }
        })
      )

      setPhotos(photosWithUrls)
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          'No se pudo cargar el evento.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e) {
    const files = Array.from(
      e.target.files || []
    )

    if (!files.length) return

    if (!user || !id) {
      setError(
        'No hay una sesión o evento válido.'
      )
      return
    }

    setUploading(true)
    setError('')
    setMessage('')

    try {
      let uploaded = 0

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          continue
        }

        const safeName = file.name
          .replace(/\s+/g, '-')
          .replace(
            /[^a-zA-Z0-9._-]/g,
            ''
          )

        const uniqueName =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}-${safeName}`

        const storagePath =
          `${user.id}/${id}/${uniqueName}`

        const { error: uploadError } =
          await supabase.storage
            .from('event-photos')
            .upload(
              storagePath,
              file,
              {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
              }
            )

        if (uploadError) {
          throw uploadError
        }

        const { error: dbError } =
          await supabase
            .from('photos')
            .insert({
              event_id: id,
              file_path: storagePath,
              file_name: file.name,
              active: true,
              price: 0,
            })

        if (dbError) {
          await supabase.storage
            .from('event-photos')
            .remove([storagePath])

          throw dbError
        }

        uploaded++
      }

      setMessage(
        `${uploaded} fotografía${
          uploaded !== 1 ? 's' : ''
        } subida${
          uploaded !== 1 ? 's' : ''
        } correctamente.`
      )

      await loadEvent()
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          'No se pudieron subir las fotografías.'
      )
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function updatePhoto(photoId, field, value) {
    setSaving(photoId)
    setError('')
    setMessage('')

    try {
      const update = {
        [field]: value,
      }

      const { error } =
        await supabase
          .from('photos')
          .update(update)
          .eq('id', photoId)

      if (error) throw error

      setPhotos((current) =>
        current.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                [field]: value,
              }
            : photo
        )
      )

      setMessage(
        'Cambios guardados correctamente.'
      )
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          'No se pudo guardar el cambio.'
      )
    } finally {
      setSaving(null)
    }
  }

  async function handleDeletePhoto(photo) {
    const confirmed = window.confirm(
      `¿Eliminar "${photo.file_name}"?`
    )

    if (!confirmed) return

    setSaving(photo.id)
    setError('')
    setMessage('')

    try {
      if (photo.file_path) {
        const { error: storageError } =
          await supabase.storage
            .from('event-photos')
            .remove([
              photo.file_path,
            ])

        if (storageError) {
          console.warn(
            storageError
          )
        }
      }

      const { error } =
        await supabase
          .from('photos')
          .delete()
          .eq('id', photo.id)

      if (error) throw error

      setPhotos((current) =>
        current.filter(
          (item) =>
            item.id !== photo.id
        )
      )

      setMessage(
        'Fotografía eliminada correctamente.'
      )
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          'No se pudo eliminar la fotografía.'
      )
    } finally {
      setSaving(null)
    }
  }

  function formatDate(date) {
    if (!date) return 'Sin fecha'

    const parsed = new Date(
      `${date}T00:00:00`
    )

    if (Number.isNaN(parsed.getTime())) {
      return date
    }

    return parsed.toLocaleDateString(
      'es-CO',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    )
  }

  if (loading) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.loadingBox}>
          <div style={styles.logo}>
            SPORT<span>PHOTO</span>
          </div>

          <div style={styles.loader} />

          <p style={styles.loadingText}>
            Cargando evento...
          </p>
        </div>
      </main>
    )
  }

  if (!event) {
    return (
      <main style={styles.loadingPage}>
        <div style={styles.errorPage}>
          <div style={styles.errorIcon}>
            !
          </div>

          <h1 style={styles.errorTitle}>
            Evento no encontrado
          </h1>

          <p style={styles.errorMessage}>
            {error ||
              'No encontramos este evento.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/admin')
            }
            style={styles.primaryButton}
          >
            Volver al Dashboard
          </button>
        </div>
      </main>
    )
  }

  const activePhotos = photos.filter(
    (photo) => photo.active !== false
  ).length

  return (
    <main style={styles.page}>
      {/* HEADER */}

      <header style={styles.header}>
        <button
          type="button"
          onClick={() =>
            navigate('/admin')
          }
          style={styles.logoButton}
        >
          <div style={styles.logo}>
            SPORT<span>PHOTO</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate('/admin')
          }
          style={styles.backButton}
        >
          ← Volver a eventos
        </button>
      </header>

      <section style={styles.container}>
        {/* CABECERA */}

        <div style={styles.eventHeader}>
          <div>
            <div style={styles.eyebrow}>
              GESTIÓN DE EVENTO
            </div>

            <h1 style={styles.title}>
              {event.name ||
                'Evento sin nombre'}
            </h1>

            <div style={styles.meta}>
              <span>
                📅{' '}
                {formatDate(
                  event.event_date
                )}
              </span>

              {event.location && (
                <span>
                  📍 {event.location}
                </span>
              )}
            </div>
          </div>

          <label
            htmlFor="photo-upload"
            style={{
              ...styles.uploadButton,
              opacity: uploading
                ? 0.6
                : 1,
            }}
          >
            {uploading
              ? 'Subiendo...'
              : '+ Subir fotografías'}

            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={handleUpload}
              style={
                styles.hiddenInput
              }
            />
          </label>
        </div>

        {/* MENSAJES */}

        {error && (
          <div style={styles.errorBox}>
            <strong>
              Error
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
              style={styles.closeError}
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div style={styles.successBox}>
            <span>
              ✓
            </span>

            {message}

            <button
              type="button"
              onClick={() =>
                setMessage('')
              }
              style={
                styles.closeSuccess
              }
            >
              ×
            </button>
          </div>
        )}

        {/* ESTADÍSTICAS */}

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              FOTOGRAFÍAS
            </span>

            <strong style={styles.statValue}>
              {photos.length}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              ACTIVAS
            </span>

            <strong style={styles.statValue}>
              {activePhotos}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              PRECIO PROMEDIO
            </span>

            <strong style={styles.statValue}>
              {photos.length
                ? `$${Math.round(
                    photos.reduce(
                      (total, photo) =>
                        total +
                        Number(
                          photo.price || 0
                        ),
                      0
                    ) /
                      photos.length
                  ).toLocaleString(
                    'es-CO'
                  )}`
                : '$0'}
            </strong>
          </div>
        </section>

        {/* GALERÍA */}

        <section style={styles.gallerySection}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Fotografías
              </h2>

              <p style={styles.sectionDescription}>
                Administra tus fotografías,
                dorsales, precios y estado.
              </p>
            </div>

            <div style={styles.photoCount}>
              {photos.length}{' '}
              {photos.length === 1
                ? 'foto'
                : 'fotos'}
            </div>
          </div>

          {photos.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                📸
              </div>

              <h3 style={styles.emptyTitle}>
                Todavía no hay fotografías
              </h3>

              <p style={styles.emptyText}>
                Sube las fotografías del
                evento para comenzar a
                construir la galería.
              </p>

              <label
                htmlFor="photo-upload-empty"
                style={styles.primaryButton}
              >
                + Subir fotografías

                <input
                  id="photo-upload-empty"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={handleUpload}
                  style={
                    styles.hiddenInput
                  }
                />
              </label>
            </div>
          ) : (
            <div style={styles.photoGrid}>
              {photos.map((photo) => {
                const isSaving =
                  saving === photo.id

                return (
                  <article
                    key={photo.id}
                    style={{
                      ...styles.photoCard,
                      opacity: isSaving
                        ? 0.65
                        : 1,
                    }}
                  >
                    {/* FOTO */}

                    <div
                      style={
                        styles.photoImageWrapper
                      }
                    >
                      {photo.url ? (
                        <img
                          src={photo.url}
                          alt={
                            photo.file_name ||
                            'Fotografía'
                          }
                          style={
                            styles.photoImage
                          }
                        />
                      ) : (
                        <div
                          style={
                            styles.noImage
                          }
                        >
                          Sin vista previa
                        </div>
                      )}

                      <div
                        style={{
                          ...styles.statusBadge,
                          background:
                            photo.active !==
                            false
                              ? '#b8ff3d'
                              : '#3b3f48',
                          color:
                            photo.active !==
                            false
                              ? '#08090d'
                              : '#c2c5cd',
                        }}
                      >
                        {photo.active !==
                        false
                          ? 'ACTIVA'
                          : 'OCULTA'}
                      </div>
                    </div>

                    {/* INFORMACIÓN */}

                    <div
                      style={
                        styles.photoInfo
                      }
                    >
                      <div
                        style={
                          styles.photoName
                        }
                      >
                        {photo.file_name ||
                          'Fotografía'}
                      </div>

                      {/* DORSAL */}

                      <div
                        style={
                          styles.fieldGroup
                        }
                      >
                        <label
                          style={
                            styles.fieldLabel
                          }
                        >
                          DORSAL
                        </label>

                        <input
                          type="text"
                          value={
                            photo.dorsal ||
                            ''
                          }
                          placeholder="Ej. 10"
                          disabled={isSaving}
                          onChange={(e) => {
                            const value =
                              e.target.value

                            setPhotos(
                              (current) =>
                                current.map(
                                  (item) =>
                                    item.id ===
                                    photo.id
                                      ? {
                                          ...item,
                                          dorsal:
                                            value,
                                        }
                                      : item
                                )
                            )
                          }}
                          onBlur={(e) =>
                            updatePhoto(
                              photo.id,
                              'dorsal',
                              e.target.value ||
                                null
                            )
                          }
                          style={
                            styles.input
                          }
                        />
                      </div>

                      {/* PRECIO */}

                      <div
                        style={
                          styles.fieldGroup
                        }
                      >
                        <label
                          style={
                            styles.fieldLabel
                          }
                        >
                          PRECIO
                        </label>

                        <div
                          style={
                            styles.priceInput
                          }
                        >
                          <span>
                            $
                          </span>

                          <input
                            type="number"
                            min="0"
                            value={
                              photo.price ??
                              0
                            }
                            disabled={
                              isSaving
                            }
                            onChange={(e) => {
                              const value =
                                e.target.value

                              setPhotos(
                                (current) =>
                                  current.map(
                                    (item) =>
                                      item.id ===
                                      photo.id
                                        ? {
                                            ...item,
                                            price:
                                              value,
                                          }
                                        : item
                                  )
                              )
                            }}
                            onBlur={(e) =>
                              updatePhoto(
                                photo.id,
                                'price',
                                Number(
                                  e.target
                                    .value ||
                                    0
                                )
                              )
                            }
                            style={
                              styles.priceField
                            }
                          />
                        </div>
                      </div>

                      {/* ACCIONES */}

                      <div
                        style={
                          styles.actions
                        }
                      >
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            updatePhoto(
                              photo.id,
                              'active',
                              photo.active ===
                                false
                            )
                          }
                          style={{
                            ...styles.toggleButton,
                            color:
                              photo.active !==
                              false
                                ? '#b8ff3d'
                                : '#8b909c',
                            borderColor:
                              photo.active !==
                              false
                                ? '#354c20'
                                : '#30343d',
                          }}
                        >
                          {photo.active !==
                          false
                            ? '● Visible'
                            : '○ Oculta'}
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleDeletePhoto(
                              photo
                            )
                          }
                          style={
                            styles.deleteButton
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}


/* =====================================================
   ESTILOS
===================================================== */

const styles = {
  page: {
    minHeight: '100vh',
    background: '#08090d',
    color: '#f5f5f7',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  loadingPage: {
    minHeight: '100vh',
    background: '#08090d',
    display: 'grid',
    placeItems: 'center',
    color: '#fff',
  },

  loadingBox: {
    textAlign: 'center',
  },

  logo: {
    fontSize: '21px',
    fontWeight: '900',
    letterSpacing: '-0.7px',
    color: '#f4f4f6',
  },

  loader: {
    width: '28px',
    height: '28px',
    border: '3px solid #242832',
    borderTop:
      '3px solid #b8ff3d',
    borderRadius: '50%',
    margin:
      '25px auto 15px',
    animation:
      'spin 1s linear infinite',
  },

  loadingText: {
    color: '#777d8d',
    fontSize: '14px',
  },

  header: {
    minHeight: '76px',
    padding: '0 5%',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: '20px',
    borderBottom:
      '1px solid #20232b',
    background: '#0b0c10',
  },

  logoButton: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
  },

  backButton: {
    border:
      '1px solid #292d37',
    background: '#111319',
    color: '#b7bac4',
    padding:
      '10px 15px',
    borderRadius: '9px',
    cursor: 'pointer',
    fontSize: '13px',
  },

  container: {
    width: '90%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding:
      '55px 0 90px',
    boxSizing: 'border-box',
  },

  eventHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent:
      'space-between',
    gap: '30px',
  },

  eyebrow: {
    color: '#b8ff3d',
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '2px',
    marginBottom: '13px',
  },

  title: {
    margin: 0,
    fontSize: '44px',
    lineHeight: 1,
    letterSpacing: '-1.8px',
    fontWeight: '800',
  },

  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '18px',
    color: '#777d8d',
    fontSize: '13px',
    marginTop: '15px',
  },

  uploadButton: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent:
      'center',
    padding:
      '14px 20px',
    borderRadius: '11px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '850',
    fontSize: '14px',
    whiteSpace:
      'nowrap',
    cursor: 'pointer',
  },

  hiddenInput: {
    display: 'none',
  },

  errorBox: {
    marginTop: '25px',
    padding:
      '14px 17px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#211317',
    border:
      '1px solid #4a252d',
    borderRadius: '11px',
    color: '#ffabb5',
    fontSize: '13px',
  },

  closeError: {
    marginLeft: 'auto',
    border: 'none',
    background:
      'transparent',
    color: '#ff9ba7',
    fontSize: '20px',
    cursor: 'pointer',
  },

  successBox: {
    marginTop: '25px',
    padding:
      '14px 17px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#141d0e',
    border:
      '1px solid #344a20',
    borderRadius: '11px',
    color: '#b8ff3d',
    fontSize: '13px',
  },

  closeSuccess: {
    marginLeft: 'auto',
    border: 'none',
    background:
      'transparent',
    color: '#b8ff3d',
    fontSize: '20px',
    cursor: 'pointer',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(3, minmax(0, 1fr))',
    gap: '14px',
    marginTop: '35px',
  },

  statCard: {
    background: '#101218',
    border:
      '1px solid #222630',
    borderRadius: '15px',
    padding: '20px',
  },

  statLabel: {
    display: 'block',
    color: '#646a79',
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '1.4px',
  },

  statValue: {
    display: 'block',
    marginTop: '10px',
    fontSize: '29px',
    fontWeight: '800',
  },

  gallerySection: {
    marginTop: '55px',
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent:
      'space-between',
    marginBottom: '22px',
    gap: '20px',
  },

  sectionTitle: {
    margin: 0,
    fontSize: '25px',
    letterSpacing: '-0.6px',
  },

  sectionDescription: {
    margin:
      '7px 0 0',
    color: '#666c7b',
    fontSize: '13px',
  },

  photoCount: {
    color: '#73798a',
    fontSize: '13px',
  },

  emptyState: {
    padding:
      '70px 25px',
    textAlign: 'center',
    background: '#101218',
    border:
      '1px dashed #292e39',
    borderRadius: '18px',
  },

  emptyIcon: {
    width: '68px',
    height: '68px',
    margin:
      '0 auto 18px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '18px',
    background: '#171a21',
    fontSize: '30px',
  },

  emptyTitle: {
    margin: 0,
    fontSize: '20px',
  },

  emptyText: {
    maxWidth: '450px',
    margin:
      '10px auto 24px',
    color: '#6e7483',
    lineHeight: 1.6,
    fontSize: '14px',
  },

  primaryButton: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent:
      'center',
    padding:
      '13px 19px',
    borderRadius: '10px',
    background: '#b8ff3d',
    color: '#08090d',
    fontWeight: '850',
    fontSize: '13px',
    cursor: 'pointer',
  },

  photoGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: '16px',
  },

  photoCard: {
    overflow: 'hidden',
    background: '#101218',
    border:
      '1px solid #222630',
    borderRadius: '14px',
    transition:
      'opacity .2s ease',
  },

  photoImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    background: '#171a21',
    overflow: 'hidden',
  },

  photoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  noImage: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: '#656b7a',
    fontSize: '12px',
  },

  statusBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    padding:
      '5px 8px',
    borderRadius: '6px',
    fontSize: '8px',
    fontWeight: '900',
    letterSpacing: '0.8px',
  },

  photoInfo: {
    padding: '14px',
  },

  photoName: {
    fontSize: '13px',
    fontWeight: '700',
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
    marginBottom: '15px',
  },

  fieldGroup: {
    marginTop: '10px',
  },

  fieldLabel: {
    display: 'block',
    color: '#5f6573',
    fontSize: '9px',
    fontWeight: '800',
    letterSpacing: '1px',
    marginBottom: '6px',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 10px',
    border:
      '1px solid #292e38',
    borderRadius: '7px',
    background: '#15171d',
    color: '#f1f2f4',
    outline: 'none',
    fontSize: '12px',
  },

  priceInput: {
    display: 'flex',
    alignItems: 'center',
    border:
      '1px solid #292e38',
    borderRadius: '7px',
    background: '#15171d',
    overflow: 'hidden',
  },

  priceField: {
    width: '100%',
    boxSizing: 'border-box',
    padding:
      '9px 8px 9px 2px',
    border: 'none',
    background:
      'transparent',
    color: '#f1f2f4',
    outline: 'none',
    fontSize: '12px',
  },

  actions: {
    display: 'grid',
    gridTemplateColumns:
      '1fr 1fr',
    gap: '8px',
    marginTop: '14px',
  },

  toggleButton: {
    padding: '9px 5px',
    background:
      '#15171d',
    border:
      '1px solid #30343d',
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '700',
  },

  deleteButton: {
    padding: '9px 5px',
    border:
      '1px solid #39242a',
    borderRadius: '7px',
    background:
      '#171216',
    color: '#e6818d',
    cursor: 'pointer',
    fontSize: '10px',
  },

  errorPage: {
    width: '90%',
    maxWidth: '500px',
    textAlign: 'center',
    padding: '30px',
    boxSizing: 'border-box',
  },

  errorIcon: {
    width: '50px',
    height: '50px',
    margin:
      '0 auto 20px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '50%',
    background: '#45212a',
    color: '#ff9ba7',
    fontSize: '24px',
    fontWeight: '900',
  },

  errorTitle: {
    margin: 0,
    fontSize: '24px',
  },

  errorMessage: {
    color: '#777d8d',
    fontSize: '14px',
    lineHeight: 1.6,
    margin:
      '12px 0 25px',
    wordBreak:
      'break-word',
  },
}