import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  crearFichaje,
  Fichaje,
  getMisCorreccionesPendientes,
  getUltimoFichaje,
} from "../src/api/fichajes";
import { obtenerTokenFCM } from "../src/notifications/push";
import { colors } from "../src/theme";

import {
  getToken,
  getUser,
  haSidoPreguntadaBiometria,
  marcarBiometriaPreguntada,
  saveBiometricSession,
} from "../src/storage/auth";

import { Usuario } from "../src/types/auth";

import OnboardingTour, {
  OnboardingStep,
  OnboardingTarget,
} from "../components/OnboardingTour";

import {
  completeOnboarding,
  hasCompletedOnboarding,
} from "../src/storage/onboarding";

import { registrarDispositivoPush } from "../src/api/dispositivosPush";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [ultimoFichaje, setUltimoFichaje] =
    useState<Fichaje | null>(null);

  const [loading, setLoading] = useState(true);
  const [fichando, setFichando] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  const [tipoRealizado, setTipoRealizado] = useState<
    "ENTRADA" | "SALIDA" | null
  >(null);

  const [error, setError] = useState("");

  const { mostrarGuia } = useLocalSearchParams<{
    mostrarGuia?: string;
  }>();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [usarGps, setUsarGps] = useState(true);

  const [correccionesPendientes, setCorreccionesPendientes] =
    useState(0);

  const [mostrarTutorial, setMostrarTutorial] =
    useState(false);

  const { height: SCREEN_HEIGHT } = Dimensions.get("window");

  // Referencias de los elementos que debe destacar el tutorial.
  const headerRef = useRef<View>(null);
  const accionesRef = useRef<View>(null);
  const gpsRef = useRef<View>(null);
  const historialRef = useRef<View>(null);
  const correccionesRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const recordatoriosRef = useRef<View>(null);

  /*
   * Indica si el tutorial que estamos mostrando corresponde
   * al onboarding inicial de la aplicación.
   *
   * Si es false, significa que el usuario lo abrió manualmente
   * desde Perfil y al terminar NO debemos preguntar por biometría.
   */
  const onboardingInicialRef = useRef(false);

  /*
   * Evita que el diálogo biométrico pueda abrirse dos veces
   * debido a varios renders o cambios de estado.
   */
  const biometriaPreguntadaRef = useRef(false);

  const [targets, setTargets] = useState<{
    header?: OnboardingTarget;
    acciones?: OnboardingTarget;
    gps?: OnboardingTarget;
    historial?: OnboardingTarget;
    correcciones?: OnboardingTarget;
    recordatorios?: OnboardingTarget;
  }>({});


  /* ============================================================
     MEDICIÓN DE ELEMENTOS DEL TUTORIAL
     ============================================================ */

  function medirElemento(
    ref: React.RefObject<View | null>,
    nombre:
      | "header"
      | "acciones"
      | "gps"
      | "historial"
      | "correcciones"
      | "recordatorios"
  ) {
    ref.current?.measureInWindow(
      (x, y, width, height) => {
        setTargets((actuales) => ({
          ...actuales,
          [nombre]: {
            x,
            y,
            width,
            height,
          },
        }));
      }
    );
  }


  /* ============================================================
     CAMBIO DE PASO DEL TUTORIAL
     ============================================================ */

  const cambiarPasoTutorial = async (paso: number) => {
    const refs = [
      headerRef,
      accionesRef,
      gpsRef,
      historialRef,
      correccionesRef,
      recordatoriosRef,
    ];

    const nombres = [
      "header",
      "acciones",
      "gps",
      "historial",
      "correcciones",
      "recordatorios",
    ] as const;

    const ref = refs[paso];

    if (!ref?.current) {
      return;
    }

    /*
     * Los tres primeros elementos están siempre visibles.
     * No necesitamos mover el ScrollView.
     */
    if (paso < 3) {
      medirElemento(ref, nombres[paso]);
      return;
    }

    /*
     * Para Historial, Correcciones y Recordatorios:
     *
     * 1. Medimos dónde está actualmente el elemento.
     * 2. Calculamos cuánto tenemos que desplazar el ScrollView.
     * 3. Esperamos a que termine la animación.
     * 4. Volvemos a medir el elemento.
     * 5. Solo entonces OnboardingTour cambia de tarjeta.
     */
    await new Promise<void>((resolve) => {
      ref.current?.measureInWindow(
        (_x, y, _width, height) => {
          const margenSuperior = 120;
          const margenInferior = 260;

          let desplazamiento = 0;

          if (y < margenSuperior) {
            desplazamiento = y - margenSuperior;
          } else if (
            y + height >
            SCREEN_HEIGHT - margenInferior
          ) {
            desplazamiento =
              y +
              height -
              (SCREEN_HEIGHT - margenInferior);
          }

          const nuevoOffset = Math.max(
            0,
            scrollOffsetRef.current + desplazamiento
          );

          if (Math.abs(desplazamiento) < 5) {
            medirElemento(
              ref,
              nombres[paso]
            );

            resolve();
            return;
          }

          scrollViewRef.current?.scrollTo({
            y: nuevoOffset,
            animated: true,
          });

          setTimeout(() => {
            medirElemento(
              ref,
              nombres[paso]
            );

            resolve();
          }, 450);
        }
      );
    });
  };

  useEffect(() => {
  async function registrarTokenFCM() {
    try {
      const token = await obtenerTokenFCM();

      if (!token) {
        return;
      }

      await registrarDispositivoPush(token);

      console.log("Dispositivo FCM registrado correctamente");
    } catch (err) {
      console.error(
        "Error registrando dispositivo FCM:",
        err
      );
    }
  }

  registrarTokenFCM();
}, []);

  /* ============================================================
     COMPROBAR ONBOARDING
     ============================================================ */

  useEffect(() => {
    async function comprobarOnboarding() {
      const completado =
        await hasCompletedOnboarding();

      /*
       * mostrarGuia === "1" significa que el usuario ha abierto
       * la guía manualmente desde Perfil.
       *
       * Por tanto:
       *
       * !completado && mostrarGuia !== "1"
       *
       * = onboarding inicial.
       */
      const esOnboardingInicial =
        !completado &&
        mostrarGuia !== "1";

      onboardingInicialRef.current =
        esOnboardingInicial;

      if (
        !completado ||
        mostrarGuia === "1"
      ) {
        scrollViewRef.current?.scrollTo({
          y: 0,
          animated: false,
        });

        scrollOffsetRef.current = 0;

        setMostrarTutorial(true);
      }
    }

    comprobarOnboarding();
  }, [mostrarGuia]);


  /* ============================================================
     BIOMETRÍA DESPUÉS DEL ONBOARDING
     ============================================================ */

  async function preguntarActivarBiometria() {
    /*
     * Primera barrera:
     * no mostrar nunca dos veces el mismo diálogo mientras
     * esta pantalla esté montada.
     */
    if (biometriaPreguntadaRef.current) {
      return;
    }

    try {
      /*
       * Segunda barrera:
       * si ya se preguntó anteriormente, no volver a preguntar.
       */
      const yaPreguntada =
        await haSidoPreguntadaBiometria();

      if (yaPreguntada) {
        biometriaPreguntadaRef.current = true;
        return;
      }

      /*
       * Comprobamos que el dispositivo dispone de biometría.
       */
      const compatible =
        await LocalAuthentication.hasHardwareAsync();

      const enrolled =
        await LocalAuthentication.isEnrolledAsync();

      if (
        !compatible ||
        !enrolled
      ) {
        return;
      }

      /*
       * Recuperamos la sesión actual.
       */
      const token =
        await getToken();

      const user =
        await getUser();

      /*
       * Sin sesión no tiene sentido guardar biometría.
       */
      if (!token || !user) {
        return;
      }

      /*
       * Marcamos la pregunta ANTES de abrir el Alert.
       *
       * Esto es importante: si React vuelve a renderizar Home
       * mientras el Alert está abierto, no podremos abrir otro.
       */
      biometriaPreguntadaRef.current = true;

      await marcarBiometriaPreguntada();

      Alert.alert(
        "Acceso con huella",
        "¿Quieres activar el acceso con huella o Face ID para entrar más rápidamente a Siscentro?",
        [
          {
            text: "Ahora no",
            style: "cancel",
          },

          {
            text: "Activar",
            onPress: async () => {
              try {
                const biometricResult =
                  await LocalAuthentication.authenticateAsync(
                    {
                      promptMessage:
                        "Confirma la activación de la biometría",

                      cancelLabel:
                        "Cancelar",

                      fallbackLabel:
                        "Usar contraseña",

                      disableDeviceFallback:
                        false,
                    }
                  );

                if (
                  !biometricResult.success
                ) {
                  return;
                }

                await saveBiometricSession(
                  token,
                  user
                );
              } catch (err) {
                console.error(
                  "Error activando biometría:",
                  err
                );
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error(
        "Error ofreciendo biometría:",
        err
      );
    }
  }


  /* ============================================================
     FINALIZAR ONBOARDING
     ============================================================ */

  async function finalizarOnboarding() {
    const eraOnboardingInicial =
      onboardingInicialRef.current;

    await completeOnboarding();

    setMostrarTutorial(false);

    /*
     * SOLO ofrecemos biometría cuando el tutorial era el
     * onboarding inicial.
     *
     * Si el usuario llegó aquí desde Perfil, no hacemos nada.
     */
    if (eraOnboardingInicial) {
      await preguntarActivarBiometria();
    }
  }


  /* ============================================================
     CORRECCIONES
     ============================================================ */

  async function cargarCorreccionesPendientes() {
    try {
      const datos =
        await getMisCorreccionesPendientes();

      setCorreccionesPendientes(
        datos.length
      );
    } catch (err) {
      console.error(err);
    }
  }


  /* ============================================================
     ÚLTIMO FICHAJE
     ============================================================ */

  async function cargarUltimoFichaje() {
    try {
      setError("");

      const fichaje =
        await getUltimoFichaje();

      setUltimoFichaje(fichaje);
    } catch (err) {
      console.error(err);

      setError(
        "No se ha podido cargar tu último fichaje"
      );
    } finally {
      setLoading(false);
    }
  }


  /* ============================================================
     USUARIO
     ============================================================ */

  async function cargarUsuario() {
    try {
      const user =
        await getUser();

      setUsuario(user);
    } catch (err) {
      console.error(err);
    }
  }


  /* ============================================================
     FICHAJE
     ============================================================ */

  async function handleFichaje(
    tipo: "ENTRADA" | "SALIDA"
  ) {
    try {
      setFichando(true);
      setError("");

      let latitud: number | null = null;
      let longitud: number | null = null;

      if (usarGps) {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (
          status !==
          Location.PermissionStatus.GRANTED
        ) {
          setError(
            "Necesitamos permiso de ubicación para registrar el fichaje con GPS"
          );

          return;
        }

        const location =
          await Location.getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.High,
          });

        latitud =
          location.coords.latitude;

        longitud =
          location.coords.longitude;
      }

      const fichaje =
        await crearFichaje(
          tipo,
          latitud,
          longitud
        );

      setUltimoFichaje(
        fichaje
      );

      setTipoRealizado(
        tipo
      );

      setTimeout(() => {
        setTipoRealizado(null);
      }, 2200);
    } catch (err) {
      console.error(err);

      setError(
        "No se ha podido registrar el fichaje"
      );
    } finally {
      setFichando(false);
    }
  }


  /* ============================================================
     NAVEGACIÓN
     ============================================================ */

  function abrirPerfil() {
    router.push("/perfil");
  }


  /* ============================================================
     CARGA INICIAL
     ============================================================ */

  useEffect(() => {
    cargarUltimoFichaje();
    cargarUsuario();
  }, []);
  useFocusEffect(
    useCallback(() => {
      cargarCorreccionesPendientes();
    }, [])
  );
useEffect(() => {
  async function registrarTokenFCM() {
    try {
      const token = await obtenerTokenFCM();

      if (token) {
        console.log("FCM TOKEN OBTENIDO:", token);
      }
    } catch (err) {
      console.error(
        "Error obteniendo token FCM:",
        err
      );
    }
  }

  registrarTokenFCM();
}, []);
  /* ============================================================
     RECARGAR AL VOLVER A HOME
     ============================================================ */




  /* ============================================================
     RELOJ
     ============================================================ */

  useEffect(() => {
    const intervalo =
      setInterval(() => {
        setAhora(
          new Date()
        );
      }, 1000);

    return () => {
      clearInterval(
        intervalo
      );
    };
  }, []);


  /* ============================================================
     FORMATEO
     ============================================================ */

  function formatearHora(
    fecha: string
  ) {
    return new Date(
      fecha
    ).toLocaleTimeString(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  function saludo() {
    const hora =
      ahora.getHours();

    if (hora < 12) {
      return "Buenos días";
    }

    if (hora < 20) {
      return "Buenas tardes";
    }

    return "Buenas noches";
  }


  function formatearFechaFichaje(
    fecha: string
  ) {
    const fechaFichaje =
      new Date(fecha);

    const hoy =
      new Date();

    const mismoDia =
      fechaFichaje.getDate() ===
        hoy.getDate() &&
      fechaFichaje.getMonth() ===
        hoy.getMonth() &&
      fechaFichaje.getFullYear() ===
        hoy.getFullYear();

    if (mismoDia) {
      return "Hoy";
    }

    const ayer =
      new Date();

    ayer.setDate(
      hoy.getDate() - 1
    );

    const esAyer =
      fechaFichaje.getDate() ===
        ayer.getDate() &&
      fechaFichaje.getMonth() ===
        ayer.getMonth() &&
      fechaFichaje.getFullYear() ===
        ayer.getFullYear();

    if (esAyer) {
      return "Ayer";
    }

    return fechaFichaje.toLocaleDateString(
      "es-ES",
      {
        day: "numeric",
        month: "short",
      }
    );
  }


  /* ============================================================
     SIGUIENTE ACCIÓN
     ============================================================ */

  const siguienteAccion:
    | "ENTRADA"
    | "SALIDA" =
    ultimoFichaje?.tipo ===
    "ENTRADA"
      ? "SALIDA"
      : "ENTRADA";

  const otraAccion:
    | "ENTRADA"
    | "SALIDA" =
    siguienteAccion ===
    "ENTRADA"
      ? "SALIDA"
      : "ENTRADA";


  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={
            colors.accent
          }
        />
      </View>
    );
  }


  /* ============================================================
     CONFIRMACIÓN DE FICHAJE
     ============================================================ */

  if (tipoRealizado) {
    return (
      <View
        style={
          styles.successScreen
        }
      >
        <View
          style={
            styles.successCircle
          }
        >
          <Feather
            name="check"
            size={44}
            color={
              colors.confirm
            }
          />
        </View>

        <Text
          style={
            styles.successTitle
          }
        >
          {tipoRealizado} registrada
        </Text>

        <Text
          style={
            styles.successTime
          }
        >
          {ultimoFichaje
            ? formatearHora(
                ultimoFichaje.fecha_hora
              )
            : ""}
        </Text>

        <Text
          style={
            styles.successSubtitle
          }
        >
          Tu fichaje se ha registrado
          correctamente
        </Text>
      </View>
    );
  }


  /* ============================================================
     PASOS DEL TUTORIAL
     ============================================================ */

  const pasosTutorial:
    OnboardingStep[] = [
      {
        title:
          "Bienvenido a SIScentro",

        description:
          "Desde esta pantalla podrás registrar tus entradas y salidas y consultar rápidamente tu jornada.",

        icon:
          "home",

        target:
          targets.header,
      },

      {
        title:
          "Registra tu jornada",

        description:
          "Utiliza los botones ENTRADA y SALIDA para registrar cuándo empiezas y terminas de trabajar.",

        icon:
          "clock",

        target:
          targets.acciones,
      },

      {
        title:
          "Ubicación GPS",

        description:
          "Puedes permitir que SIScentro registre tu ubicación al realizar un fichaje. Puedes activar o desactivar esta opción cuando quieras.",

        icon:
          "map-pin",

        target:
          targets.gps,
      },

      {
        title:
          "Consulta tus fichajes",

        description:
          "En Historial podrás consultar los fichajes que has realizado y revisar tu jornada.",

        icon:
          "list",

        target:
          targets.historial,
      },

      {
        title:
          "Correcciones",

        description:
          "Si necesitas corregir algún fichaje, podrás solicitar una corrección desde esta sección.",

        icon:
          "edit-3",

        target:
          targets.correcciones,
      },

      {
        title:
          "Recordatorios",

        description:
          "Puedes configurar recordatorios para ayudarte a no olvidar tus fichajes.",

        icon:
          "bell",

        target:
          targets.recordatorios,
      },
    ];


  /* ============================================================
     UI
     ============================================================ */

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:
            insets.top,
        },
      ]}
    >
      <View
        ref={headerRef}
        onLayout={() => {
          setTimeout(() => {
            medirElemento(
              headerRef,
              "header"
            );
          }, 100);
        }}
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerInfo
          }
        >
          <Text
            style={
              styles.brand
            }
          >
            SIScentro
          </Text>

          <Text
            style={
              styles.greeting
            }
          >
            {saludo()}
            {usuario?.nombre
              ? ", " +
                usuario.nombre
              : ""}
          </Text>

          <Text
            style={
              styles.clock
            }
          >
            {ahora.toLocaleTimeString(
              "es-ES",
              {
                hour:
                  "2-digit",
                minute:
                  "2-digit",
              }
            )}
          </Text>

          <Text
            style={
              styles.today
            }
          >
            {ahora.toLocaleDateString(
              "es-ES",
              {
                weekday:
                  "long",
                day:
                  "numeric",
                month:
                  "long",
              }
            )}
          </Text>
        </View>

        <Pressable
          style={
            styles.profile
          }
          onPress={
            abrirPerfil
          }
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Perfil"
        >
          <Feather
            name="user"
            size={19}
            color={
              colors.inkMuted
            }
          />
        </Pressable>
      </View>


      <ScrollView
        ref={scrollViewRef}
        style={
          styles.content
        }
        onScroll={(event) => {
          scrollOffsetRef.current =
            event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom:
              insets.bottom +
              24,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.lastInline
          }
        >
          <View
            style={[
              styles.statusDot,
              ultimoFichaje?.tipo ===
                "ENTRADA" &&
                styles.statusDotActive,
            ]}
          />

          <Text
            style={
              styles.lastInlineText
            }
          >
            {ultimoFichaje ? (
              <>
                Último fichaje:{" "}
                <Text
                  style={
                    styles.lastInlineTextStrong
                  }
                >
                  {ultimoFichaje.tipo ===
                  "ENTRADA"
                    ? "Entrada"
                    : "Salida"}
                </Text>
                {" · "}
                {formatearFechaFichaje(
                  ultimoFichaje.fecha_hora
                )}
                {" · "}
                {formatearHora(
                  ultimoFichaje.fecha_hora
                )}
              </>
            ) : (
              "Todavía no tienes fichajes"
            )}
          </Text>
        </View>


        {error ? (
          <Text
            style={
              styles.error
            }
          >
            {error}
          </Text>
        ) : null}


        <View
          ref={accionesRef}
          onLayout={() => {
            setTimeout(() => {
              medirElemento(
                accionesRef,
                "acciones"
              );
            }, 100);
          }}
        >
          {renderBotonFichaje(
            siguienteAccion,
            true
          )}

          {renderBotonFichaje(
            otraAccion,
            false
          )}
        </View>


        <View
          ref={gpsRef}
          onLayout={() => {
            setTimeout(() => {
              medirElemento(
                gpsRef,
                "gps"
              );
            }, 100);
          }}
          style={
            styles.gpsRow
          }
        >
          <Feather
            name="map-pin"
            size={16}
            color={
              colors.inkMuted
            }
          />

          <Text
            style={
              styles.gpsRowText
            }
          >
            {usarGps
              ? "Ubicación GPS activada"
              : "Ubicación GPS desactivada"}
          </Text>

          <Switch
            value={
              usarGps
            }
            onValueChange={
              setUsarGps
            }
            trackColor={{
              false:
                colors.border,
              true:
                colors.accent,
            }}
            thumbColor={
              colors.surface
            }
            ios_backgroundColor={
              colors.border
            }
          />
        </View>


        <View
          style={
            styles.linksContainer
          }
        >
          <Pressable
            ref={
              historialRef
            }
            style={
              styles.linkRow
            }
            onLayout={() => {
              setTimeout(() => {
                medirElemento(
                  historialRef,
                  "historial"
                );
              }, 100);
            }}
            onPress={() => {
              router.push(
                "/historial"
              );
            }}
          >
            <Feather
              name="clock"
              size={18}
              color={
                colors.inkMuted
              }
            />

            <Text
              style={
                styles.linkText
              }
            >
              Ver mis fichajes
            </Text>

            <Feather
              name="chevron-right"
              size={18}
              color={
                colors.inkFaint
              }
            />
          </Pressable>


          <View
            style={
              styles.linkDivider
            }
          />


          <Pressable
            ref={
              correccionesRef
            }
            style={
              styles.linkRow
            }
            onLayout={() => {
              setTimeout(() => {
                medirElemento(
                  correccionesRef,
                  "correcciones"
                );
              }, 100);
            }}
            onPress={() => {
              router.push(
                "/correcciones"
              );
            }}
          >
            <Feather
              name="edit-3"
              size={18}
              color={
                colors.inkMuted
              }
            />

            <Text
              style={
                styles.linkText
              }
            >
              Correcciones
            </Text>

            {correccionesPendientes >
              0 && (
              <View
                style={
                  styles.badge
                }
              >
                <Text
                  style={
                    styles.badgeText
                  }
                >
                  {
                    correccionesPendientes
                  }
                </Text>
              </View>
            )}

            <Feather
              name="chevron-right"
              size={18}
              color={
                colors.inkFaint
              }
            />
          </Pressable>


          <View
            style={
              styles.linkDivider
            }
          />


          <Pressable
            ref={
              recordatoriosRef
            }
            style={
              styles.linkRow
            }
            onLayout={() => {
              setTimeout(() => {
                medirElemento(
                  recordatoriosRef,
                  "recordatorios"
                );
              }, 100);
            }}
            onPress={() => {
              router.push(
                "/recordatorios"
              );
            }}
          >
            <Feather
              name="bell"
              size={18}
              color={
                colors.inkMuted
              }
            />

            <Text
              style={
                styles.linkText
              }
            >
              Mis recordatorios
            </Text>

            <Feather
              name="chevron-right"
              size={18}
              color={
                colors.inkFaint
              }
            />
          </Pressable>
        </View>
      </ScrollView>


      <OnboardingTour
        visible={
          mostrarTutorial
        }
        steps={
          pasosTutorial
        }
        onStepChange={
          cambiarPasoTutorial
        }
        onFinish={
          finalizarOnboarding
        }
      />
    </View>
  );


  /* ============================================================
     BOTÓN DE FICHAJE
     ============================================================ */

  function renderBotonFichaje(
    tipo:
      | "ENTRADA"
      | "SALIDA",
    principal: boolean
  ) {
    const icono =
      tipo === "ENTRADA"
        ? "log-in"
        : "log-out";

    const etiqueta =
      tipo === "ENTRADA"
        ? "Registrar entrada"
        : "Registrar salida";

    return (
      <Pressable
        style={({ pressed }) => [
          principal
            ? styles.actionPrimary
            : styles.actionSecondary,

          pressed &&
            styles.actionPressed,

          fichando &&
            styles.disabled,
        ]}
        disabled={
          fichando
        }
        onPress={() => {
          handleFichaje(
            tipo
          );
        }}
      >
        <View
          style={
            principal
              ? styles.actionIconPrimary
              : styles.actionIconSecondary
          }
        >
          {fichando &&
          principal ? (
            <ActivityIndicator
              size="small"
              color={
                colors.surface
              }
            />
          ) : (
            <Feather
              name={icono}
              size={20}
              color={
                principal
                  ? colors.surface
                  : colors.inkMuted
              }
            />
          )}
        </View>

        <View
          style={
            styles.actionText
          }
        >
          <Text
            style={
              principal
                ? styles.actionTitlePrimary
                : styles.actionTitleSecondary
            }
          >
            {tipo}
          </Text>

          <Text
            style={
              principal
                ? styles.actionSubtitlePrimary
                : styles.actionSubtitleSecondary
            }
          >
            {etiqueta}
          </Text>
        </View>

        <Feather
          name="chevron-right"
          size={22}
          color={
            principal
              ? "rgba(255,255,255,0.7)"
              : colors.inkFaint
          }
        />
      </Pressable>
    );
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.canvas,
    paddingHorizontal: 20,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent:
      "center",
    backgroundColor:
      colors.canvas,
  },

  header: {
    paddingTop: 18,
    paddingBottom: 8,
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
  },

  headerInfo: {
    flex: 1,
  },

  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.2,
  },

  greeting: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 3,
  },

  profile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems:
      "center",
    justifyContent:
      "center",
    marginLeft: 12,
    marginTop: 2,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    flexGrow: 1,
    justifyContent:
      "center",
    paddingTop: 12,
  },

  clock: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 18,
    letterSpacing: -1,
  },

  today: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 2,
    textTransform:
      "capitalize",
  },

  lastInline: {
    flexDirection:
      "row",
    alignItems:
      "center",
    marginBottom: 20,
  },

  lastInlineText: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.inkMuted,
  },

  lastInlineTextStrong: {
    fontWeight: "600",
    color: colors.ink,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor:
      colors.borderStrong,
  },

  statusDotActive: {
    backgroundColor:
      colors.accent,
  },

  actionPrimary: {
    height: 84,
    borderRadius: 14,
    backgroundColor:
      colors.accent,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 18,
    marginBottom: 10,
  },

  actionSecondary: {
    height: 64,
    borderRadius: 12,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  actionIconPrimary: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      "rgba(255,255,255,0.15)",
  },

  actionIconSecondary: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      colors.surfaceAlt,
  },

  actionText: {
    flex: 1,
    marginLeft: 14,
  },

  actionTitlePrimary: {
    fontSize: 16.5,
    fontWeight: "800",
    color: colors.surface,
    letterSpacing: 0.2,
  },

  actionSubtitlePrimary: {
    fontSize: 12.5,
    color:
      "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  actionTitleSecondary: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.inkMuted,
  },

  actionSubtitleSecondary: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },

  actionPressed: {
    opacity: 0.85,
  },

  disabled: {
    opacity: 0.6,
  },

  gpsRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 10,
  },

  gpsRowText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: colors.inkMuted,
  },

  linksContainer: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow:
      "hidden",
  },

  linkRow: {
    height: 54,
    flexDirection:
      "row",
    alignItems:
      "center",
    gap: 12,
  },

  linkDivider: {
    height: 1,
    backgroundColor:
      colors.border,
  },

  linkText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.ink,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor:
      colors.accent,
    alignItems:
      "center",
    justifyContent:
      "center",
    marginRight: 4,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.surface,
  },

  error: {
    color: colors.danger,
    textAlign:
      "center",
    marginBottom: 12,
    fontSize: 13.5,
  },

  successScreen: {
    flex: 1,
    backgroundColor:
      colors.canvas,
    alignItems:
      "center",
    justifyContent:
      "center",
    padding: 30,
  },

  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor:
      colors.confirmSoft,
    alignItems:
      "center",
    justifyContent:
      "center",
    marginBottom: 24,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    textAlign:
      "center",
    textTransform:
      "capitalize",
  },

  successTime: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 8,
  },

  successSubtitle: {
    fontSize: 14.5,
    color: colors.inkMuted,
    textAlign:
      "center",
    marginTop: 12,
  },
});