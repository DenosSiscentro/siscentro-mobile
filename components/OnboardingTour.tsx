import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type OnboardingTarget = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OnboardingStep = {
  title: string;
  description: string;
  icon?: string;
  target?: OnboardingTarget;
};

type Props = {
  visible: boolean;
  steps: OnboardingStep[];
  onStepChange?: (
    step: number
  ) => void | Promise<void>;
  onFinish: () => void | Promise<void>;
};

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} = Dimensions.get("window");

const FOCUS_PADDING = 8;
const CARD_MARGIN = 16;
const CARD_GAP = 18;
const CARD_MAX_HEIGHT = Math.min(
  260,
  SCREEN_HEIGHT -
    CARD_MARGIN * 2
);

export default function OnboardingTour({
  visible,
  steps,
  onStepChange,
  onFinish,
}: Props) {
  const [
    currentStep,
    setCurrentStep,
  ] = useState(0);

  const [
    cardHeight,
    setCardHeight,
  ] = useState(0);


  /* ============================================================
     REINICIAR TUTORIAL
     ============================================================ */

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setCardHeight(0);
    }
  }, [visible]);


  if (
    !visible ||
    steps.length === 0
  ) {
    return null;
  }

  const step =
    steps[currentStep];

  const target =
    step.target;


  /* ============================================================
     SIGUIENTE
     ============================================================ */

  const handleNext =
    async () => {
      if (
        currentStep >=
        steps.length - 1
      ) {
        await onFinish();
        return;
      }

      const nextStep =
        currentStep + 1;

      if (onStepChange) {
        await onStepChange(
          nextStep
        );
      }

      setCurrentStep(
        nextStep
      );
    };


  /* ============================================================
     ANTERIOR
     ============================================================ */

  const handlePrevious =
    async () => {
      if (
        currentStep <= 0
      ) {
        return;
      }

      const previousStep =
        currentStep - 1;

      if (onStepChange) {
        await onStepChange(
          previousStep
        );
      }

      setCurrentStep(
        previousStep
      );
    };


  /* ============================================================
     ÁREA ENFOCADA
     ============================================================ */

  const focusX =
    target
      ? Math.max(
          0,
          target.x -
            FOCUS_PADDING
        )
      : 0;

  const focusY =
    target
      ? Math.max(
          0,
          target.y -
            FOCUS_PADDING
        )
      : 0;

  const focusWidth =
    target
      ? Math.min(
          SCREEN_WIDTH -
            focusX,
          target.width +
            FOCUS_PADDING *
              2
        )
      : 0;

  const focusHeight =
    target
      ? Math.min(
          SCREEN_HEIGHT -
            focusY,
          target.height +
            FOCUS_PADDING *
              2
        )
      : 0;


/* ============================================================
   POSICIÓN DE LA TARJETA
   ============================================================ */

let cardTop = CARD_MARGIN;
if (currentStep === 0) {
  cardTop = 250;

  // Evitar que la tarjeta se salga por abajo
  cardTop = Math.min(
    cardTop,
    SCREEN_HEIGHT -
      cardHeight -
      CARD_MARGIN
  );
}
if (
  target &&
  cardHeight > 0
) {
  const spaceBelow =
    SCREEN_HEIGHT -
    (focusY + focusHeight) -
    CARD_MARGIN;

  const spaceAbove =
    focusY -
    CARD_MARGIN;

  /*
   * Preferimos colocar la tarjeta debajo.
   */
  if (
    spaceBelow >=
    cardHeight + CARD_GAP
  ) {
    cardTop =
      focusY +
      focusHeight +
      CARD_GAP;
  }

  /*
   * Si no cabe debajo, intentamos arriba.
   */
  else if (
    spaceAbove >=
    cardHeight + CARD_GAP
  ) {
    cardTop =
      focusY -
      cardHeight -
      CARD_GAP;
  }

  /*
   * Caso extremo:
   * la mantenemos completamente dentro
   * de la pantalla.
   */
  else {
    cardTop =
      Math.max(
        CARD_MARGIN,
        Math.min(
          focusY +
            focusHeight +
            CARD_GAP,
          SCREEN_HEIGHT -
            cardHeight -
            CARD_MARGIN
        )
      );
  }
} else if (
  !target &&
  cardHeight > 0
) {
  cardTop =
    SCREEN_HEIGHT -
    cardHeight -
    CARD_MARGIN;
}

  /* ============================================================
     UI
     ============================================================ */

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={
        onFinish
      }
    >
      <View
        style={
          styles.container
        }
      >
        {target ? (
          <>
            {/* Zona superior */}
            <View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  left: 0,
                  top: 0,
                  width:
                    SCREEN_WIDTH,
                  height:
                    focusY,
                },
              ]}
            />

            {/* Zona izquierda */}
            <View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  left: 0,
                  top:
                    focusY,
                  width:
                    focusX,
                  height:
                    focusHeight,
                },
              ]}
            />

            {/* Zona derecha */}
            <View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  left:
                    focusX +
                    focusWidth,
                  top:
                    focusY,
                  width:
                    Math.max(
                      0,
                      SCREEN_WIDTH -
                        (focusX +
                          focusWidth)
                    ),
                  height:
                    focusHeight,
                },
              ]}
            />

            {/* Zona inferior */}
            <View
              pointerEvents="none"
              style={[
                styles.overlay,
                {
                  left: 0,
                  top:
                    focusY +
                    focusHeight,
                  width:
                    SCREEN_WIDTH,
                  height:
                    Math.max(
                      0,
                      SCREEN_HEIGHT -
                        (focusY +
                          focusHeight)
                    ),
                },
              ]}
            />

            {/* Marco del elemento enfocado */}
            <View
              pointerEvents="none"
              style={[
                styles.focus,
                {
                  left:
                    focusX,
                  top:
                    focusY,
                  width:
                    focusWidth,
                  height:
                    focusHeight,
                },
              ]}
            />
          </>
        ) : (
          <View
            pointerEvents="none"
            style={
              styles.fullOverlay
            }
          />
        )}


        {/* ======================================================
            TARJETA
            ====================================================== */}

        <View
          onLayout={(
            event
          ) => {
            const height =
              event.nativeEvent
                .layout.height;

            if (
              height !==
              cardHeight
            ) {
              setCardHeight(
                height
              );
            }
          }}
          style={[
            styles.card,
            {
              top:
                cardTop,
              maxHeight:
                CARD_MAX_HEIGHT,
            },
          ]}
        >
          <View
            style={
              styles.headerRow
            }
          >
            <View
              style={
                styles.stepBadge
              }
            >
              <Text
                style={
                  styles.stepBadgeText
                }
              >
                {currentStep +
                  1}
                /
                {steps.length}
              </Text>
            </View>

            <Text
              style={
                styles.title
              }
            >
              {step.title}
            </Text>
          </View>


          <Text
            style={
              styles.description
            }
          >
            {step.description}
          </Text>


          <View
            style={
              styles.footer
            }
          >
            {currentStep >
            0 ? (
              <Pressable
                onPress={
                  handlePrevious
                }
                style={({
                  pressed,
                }) => [
                  styles.secondaryButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Feather
                  name="arrow-left"
                  size={18}
                  color="#111827"
                />

                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  Atrás
                </Text>
              </Pressable>
            ) : (
              <View />
            )}


            <Pressable
              onPress={
                handleNext
              }
              style={({
                pressed,
              }) => [
                styles.primaryButton,
                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {currentStep ===
                steps.length - 1
                  ? "Empezar"
                  : "Siguiente"}
              </Text>

              <Feather
                name={
                  currentStep ===
                  steps.length - 1
                    ? "check"
                    : "arrow-right"
                }
                size={18}
                color="#ffffff"
              />
            </Pressable>
          </View>


          {/* Solo mostramos Saltar en el primer paso */}
          {currentStep ===
          0 ? (
            <Pressable
              onPress={
                onFinish
              }
              style={({
                pressed,
              }) => [
                styles.skipButton,
                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={
                  styles.skipButtonText
                }
              >
                Saltar guía
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}


const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      position:
        "relative",
    },

    overlay: {
      position:
        "absolute",
      backgroundColor:
        "rgba(0, 0, 0, 0.68)",
    },

    fullOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor:
        "rgba(0, 0, 0, 0.68)",
    },

    focus: {
      position:
        "absolute",
      borderWidth: 2,
      borderColor:
        "#ffffff",
      borderRadius: 12,
      backgroundColor:
        "transparent",
    },

    card: {
      position:
        "absolute",
      left:
        CARD_MARGIN,
      right:
        CARD_MARGIN,
      backgroundColor:
        "#ffffff",
      borderRadius: 18,
      padding: 18,
      shadowColor:
        "#000000",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity:
        0.25,
      shadowRadius:
        20,
      elevation: 12,
    },

    headerRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom:
        12,
    },

    stepBadge: {
      minWidth: 48,
      height: 30,
      paddingHorizontal:
        10,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#111827",
      marginRight:
        12,
    },

    stepBadgeText: {
      color:
        "#ffffff",
      fontSize: 13,
      fontWeight:
        "700",
    },

    title: {
      flex: 1,
      color:
        "#111827",
      fontSize: 21,
      fontWeight:
        "700",
    },

    description: {
      color:
        "#4b5563",
      fontSize: 16,
      lineHeight: 24,
    },

    footer: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop:
        14,
    },

    secondaryButton: {
      minHeight: 48,
      paddingHorizontal:
        14,
      borderRadius: 12,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
    },

    secondaryButtonText: {
      color:
        "#111827",
      fontSize: 15,
      fontWeight:
        "600",
    },

    primaryButton: {
      minHeight: 48,
      paddingHorizontal:
        18,
      borderRadius: 12,
      backgroundColor:
        "#111827",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    primaryButtonText: {
      color:
        "#ffffff",
      fontSize: 15,
      fontWeight:
        "700",
    },

    skipButton: {
      alignSelf:
        "center",
      marginTop: 6,
      paddingHorizontal:
        12,
      paddingVertical:
        8,
    },

    skipButtonText: {
      color:
        "#6b7280",
      fontSize: 14,
      fontWeight:
        "500",
    },

    pressed: {
      opacity: 0.7,
    },
  });