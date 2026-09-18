import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

type CriterionSeed = {
  text: string;
  notApplicableIfAutomatic?: boolean;
};

type RubricDimensionSeed = {
  name: string;
  levels: [string, string, string, string]; // niveles 1..4
};

type LessonSeed = {
  code: string;
  name: string;
  hasRubric: boolean;
  criteria: CriterionSeed[];
  rubricDimensions: RubricDimensionSeed[];
};

// Transcripción fiel del "Expediente Pedagógico" en papel (curso Auto, sección 5 del spec).
const AUTO_LESSONS: LessonSeed[] = [
  {
    code: "L00",
    name: "Partes del vehículo y sus funciones",
    hasRubric: false,
    rubricDimensions: [],
    criteria: [
      { text: "Identifica correctamente los pedales y sus funciones según el tipo de vehículo (automático o estándar)" },
      { text: "Coloca correctamente los pies en los pedales (posición y control)" },
      { text: "Ajusta correctamente asiento y retrovisores antes de iniciar la marcha" },
      { text: "Sujeta correctamente el timón (posición de manos y pulgares)" },
    ],
  },
  {
    code: "L01",
    name: "Salir y parar",
    hasRubric: true,
    criteria: [
      { text: "Enciende el vehículo correctamente en neutro" },
      { text: "Coloca correctamente la primera velocidad para salir" },
      { text: "Coordina acelerador y clutch para iniciar la marcha" },
      { text: "Realiza la salida sin que el vehículo se apague" },
      { text: "Detiene el vehículo siguiendo el orden correcto (freno, clutch, neutro)" },
    ],
    rubricDimensions: [
      {
        name: "Salida y parada del vehículo",
        levels: [
          "No logra salir ni parar sin ayuda",
          "Logra salir y parar con ayuda constante del instructor",
          "Intenta salir pero se le apaga el carro (sin ayuda del instructor)",
          "Logra salir y parar de forma independiente y controlada",
        ],
      },
    ],
  },
  {
    code: "L02",
    name: "Cambio a segunda velocidad",
    hasRubric: true,
    criteria: [
      { text: "Reconoce el momento adecuado para cambiar de primera a segunda" },
      { text: "Realiza el cambio siguiendo el orden correcto de pies" },
      { text: "Coloca la segunda velocidad con precisión, sin detenerse en neutro" },
      { text: "Mantiene el vehículo en movimiento durante el cambio" },
      { text: "Suelta el clutch de forma gradual y controlada" },
      { text: "Continúa la marcha en segunda sin pérdida de fuerza ni apagado" },
    ],
    rubricDimensions: [
      {
        name: "Cambio a segunda velocidad",
        levels: [
          "No logra realizar el cambio correctamente",
          "Realiza el cambio con interrupciones o pérdida de control",
          "Realiza el cambio con indicaciones verbales",
          "Realiza el cambio de forma independiente, fluida y controlada",
        ],
      },
    ],
  },
  {
    code: "L03",
    name: "Cambio a tercera velocidad",
    hasRubric: true,
    criteria: [
      { text: "Reconoce el momento adecuado para cambiar de segunda a tercera velocidad" },
      { text: "Identifica y ejecuta correctamente la trayectoria de la tercera velocidad en la palanca" },
      { text: "Realiza el cambio aplicando la misma lógica de pies aprendida previamente" },
      { text: "Coloca la tercera velocidad sin forzar la palanca ni desviarse hacia otras velocidades" },
      { text: "Mantiene el vehículo en movimiento continuo durante el cambio" },
      { text: "Continúa la marcha en tercera de forma estable y controlada" },
    ],
    rubricDimensions: [
      {
        name: "Cambio a tercera velocidad",
        levels: [
          "No logra realizar el cambio correctamente",
          "Realiza el cambio con errores de trayectoria o pérdida de control",
          "Realiza el cambio con indicaciones verbales",
          "Realiza el cambio de forma independiente, fluida y controlada",
        ],
      },
    ],
  },
  {
    code: "L04",
    name: "Regreso de velocidades",
    hasRubric: true,
    criteria: [
      { text: "Comprende la función de cada velocidad según fuerza, movimiento y control" },
      { text: "Realiza cambios ascendentes aplicando la aceleración adecuada" },
      { text: "Realiza cambios descendentes dejando de acelerar y usando el clutch correctamente" },
      { text: "Aplica la compresión del motor para disminuir la velocidad de forma controlada" },
      { text: "Ejecuta cambios descendentes de manera suave, sin tirones ni brusquedad" },
      { text: "Selecciona la velocidad correcta ante cruces u obstáculos básicos" },
    ],
    rubricDimensions: [
      {
        name: "Cambios descendentes y compresión",
        levels: [
          "No logra aplicar correctamente el regreso de velocidades",
          "Realiza los cambios con errores o de forma brusca",
          "Realiza los cambios con indicaciones verbales",
          "Aplica los cambios descendentes de forma independiente, suave y controlada",
        ],
      },
    ],
  },
  {
    code: "L05",
    name: "Cómo mantener su derecha",
    hasRubric: true,
    criteria: [
      { text: "Identifica correctamente el centro del vehículo desde su posición de manejo" },
      { text: "Reconoce y mantiene la referencia visual" },
      { text: "Conserva una distancia constante respecto a la cuneta durante la marcha" },
      { text: "Corrige la dirección sin movimientos bruscos del timón" },
      { text: "Mantiene su carril sin invadir el espacio contrario" },
      { text: "Aplica la referencia para pasar entre obstáculos de forma segura" },
    ],
    rubricDimensions: [
      {
        name: "Mantener su derecha",
        levels: [
          "No logra identificar ni mantener su derecha",
          "Mantiene su derecha de forma inestable",
          "Mantiene su derecha con indicaciones verbales",
          "Mantiene su derecha de forma independiente, precisa y constante",
        ],
      },
    ],
  },
  {
    code: "L06",
    name: "Cómo mantener la estabilidad del vehículo",
    hasRubric: true,
    criteria: [
      { text: "Mantiene el vehículo en línea recta durante los cambios de velocidad" },
      { text: "Controla el timón con firmeza sin movimientos bruscos" },
      { text: "Realiza el ejercicio de estabilidad usando la palma de la mano correctamente" },
      { text: "Mantiene el control del vehículo usando una sola mano en primera velocidad" },
      { text: "Mantiene la estabilidad del vehículo al repetir el ejercicio en segunda velocidad" },
      { text: "Aplica el control aprendido al realizar cambios normales de velocidad" },
    ],
    rubricDimensions: [
      {
        name: "Estabilidad del vehículo",
        levels: [
          "Pierde el control del timón y la trayectoria del vehículo",
          "Mantiene estabilidad parcial con dificultad",
          "Mantiene estabilidad con indicaciones del instructor",
          "Mantiene estabilidad de forma independiente, firme y constante",
        ],
      },
    ],
  },
  {
    code: "L07",
    name: "Viraje técnico",
    hasRubric: true,
    criteria: [
      { text: "Reconoce la diferencia entre viraje técnico y viraje no recomendado" },
      { text: "Coloca correctamente las manos en el timón antes de iniciar el viraje" },
      { text: "Coordina correctamente la mano principal y la mano de acompañamiento según el sentido del giro" },
      { text: "Mantiene el control y la estabilidad del vehículo durante el viraje" },
      { text: "Aplica el viraje técnico en zigzag en primera y segunda velocidad" },
    ],
    rubricDimensions: [
      {
        name: "Viraje técnico",
        levels: [
          "No logra coordinar el movimiento de manos",
          "Realiza el viraje con cruces o pérdida de control",
          "Realiza el viraje con guía verbal o física del instructor",
          "Realiza el viraje técnico de forma independiente, fluida",
        ],
      },
    ],
  },
  {
    code: "L08",
    name: "Los altos",
    hasRubric: true,
    criteria: [
      { text: "Reconoce el punto exacto donde debe detenerse antes de la zona peatonal" },
      { text: "Distingue los tipos de zona peatonal (cebra, lineal e imaginaria)" },
      {
        text: "Anticipa el alto utilizando correctamente la compresión del motor (En caso de automático, no es necesario)",
        notApplicableIfAutomatic: true,
      },
      { text: "Coordina freno y clutch para lograr una detención suave y controlada" },
      { text: "Adapta la forma de frenar según el tipo de alto (recta, bajada o cuesta)" },
      { text: "Realiza la detención sin pasarse del alto ni quedar excesivamente atrás" },
    ],
    rubricDimensions: [
      {
        name: "Altos",
        levels: [
          "No logra detenerse en el punto correcto",
          "Se detiene con brusquedad o mala anticipación",
          "Se detiene correctamente con indicaciones del instructor",
          "Realiza altos de forma independiente, anticipada y suave",
        ],
      },
    ],
  },
  {
    code: "L09",
    name: "Cómo tomar los cruces",
    hasRubric: true,
    criteria: [
      {
        text: "Reduce la velocidad antes del cruce utilizando compresión del motor (En el caso de vehículo automático, solo reduce la velocidad)",
        notApplicableIfAutomatic: true,
      },
      { text: "Selecciona la velocidad adecuada para cruzar según espacio, vía y control del vehículo" },
      { text: "Evita cruzar en tercera velocidad cuando las condiciones no son seguras" },
      { text: "Cruza en segunda velocidad cuando el espacio es reducido o el control aún es limitado" },
      { text: "Aplica el viraje técnico correctamente durante el cruce" },
      { text: "Utiliza el freno de pie con suavidad al entrar y durante el cruce, en bajada" },
    ],
    rubricDimensions: [
      {
        name: "Tomar cruces",
        levels: [
          "No logra coordinar velocidad y control en el cruce",
          "Solo logra coordinar velocidad o control al cruzar",
          "Realiza cruces correctos con indicaciones del instructor",
          "Realiza cruces de forma independiente, segura y fluida",
        ],
      },
    ],
  },
  {
    code: "L10",
    name: "Cruce a la derecha",
    hasRubric: true,
    criteria: [
      { text: "Utiliza correctamente y con anticipación las señales para cruzar a la derecha" },
      { text: "Observa el retrovisor y decide adecuadamente en qué momento cruzar" },
      { text: "Se ubica con anticipación en el carril derecho y señaliza a tiempo" },
      { text: "Avanza hasta la boca-calle cuando la visibilidad es limitada y se detiene correctamente" },
      { text: "Observa el tráfico a la izquierda y sale con control y precaución" },
    ],
    rubricDimensions: [
      {
        name: "Pedir vía a la derecha",
        levels: [
          "No reconoce cuándo hacer alto ni cómo pedir vía",
          "Pide vía de forma incompleta o con errores de señalización y fuera de tiempo",
          "Pide vía correctamente con indicaciones del instructor",
          "Pide vía de forma independiente, clara y segura",
        ],
      },
    ],
  },
  {
    code: "L11",
    name: "Base del balance y levantada en pendiente",
    hasRubric: true,
    criteria: [
      { text: "Reconoce el retroceso del vehículo en pendiente y su riesgo" },
      { text: "Identifica el punto de vibración del clutch y su función" },
      { text: "Coordina clutch, freno y acelerador para evitar que el vehículo se vaya hacia atrás" },
      { text: "Suelta el freno de pie y pasa al acelerador sin pérdida de control" },
      { text: "Logra iniciar la marcha en pendiente sin apagársele el vehículo" },
      { text: "Aplica el balance solo en situaciones necesarias (uso consciente del clutch)" },
    ],
    rubricDimensions: [
      {
        name: "Pendientes",
        levels: [
          "No logra controlar el vehículo y se va hacia atrás",
          "Intenta el balance, pero pierde control o se le apaga el vehículo",
          "Realiza el balance con indicaciones del instructor",
          "Realiza el balance de forma independiente, segura y controlada",
        ],
      },
    ],
  },
  {
    code: "L12",
    name: "Cruce a la izquierda",
    hasRubric: true,
    criteria: [
      { text: "Reconoce que el cruce a la izquierda es una maniobra de alto riesgo y aplica manejo defensivo" },
      { text: "Utiliza correctamente las señales de mano y direccionales con anticipación" },
      { text: "Observa y evalúa el tráfico frontal, lateral y trasero antes de cruzar" },
      { text: "Se posiciona correctamente según el tipo de boca-calle" },
      { text: "Respeta el orden de prioridad de paso y el derecho de paso" },
      { text: "Ejecuta el cruce en ángulo correcto e incorpora correctamente al carril adecuado" },
    ],
    rubricDimensions: [
      {
        name: "Cruce a la izquierda",
        levels: [
          "No logra identificar el momento seguro para cruzar ni respeta prioridades",
          "Realiza el cruce con errores de ubicación, señalización o detención",
          "Realiza el cruce correctamente con indicaciones verbales del instructor",
          "Realiza el cruce a la izquierda de forma independiente, segura y aplicando manejo defensivo",
        ],
      },
    ],
  },
  {
    code: "L13",
    name: "Redondeles",
    hasRubric: true,
    criteria: [
      { text: "Reconoce que al llegar al redondel siempre debe hacer ALTO (salvo semáforo en verde)" },
      { text: "Cede correctamente el derecho de paso a los vehículos que ya circulan dentro" },
      { text: "Elige el carril adecuado antes de ingresar según la salida que tomará" },
      { text: "Mantiene velocidad constante y controlada dentro del redondel, sin detenerse" },
      { text: "Señaliza correctamente los cambios de carril y la salida del redondel" },
      { text: "Sale por la derecha de forma ordenada, sin invadir carriles ni frenar bruscamente" },
    ],
    rubricDimensions: [
      {
        name: "Manejo en redondeles",
        levels: [
          "No respeta el alto ni el derecho de paso",
          "Respeta el alto, pero presenta errores de carril o señalización",
          "Realiza el recorrido correctamente con indicaciones del instructor",
          "Circula y sale del redondel de forma independiente, segura y con manejo defensivo",
        ],
      },
    ],
  },
  {
    code: "L14",
    name: "Retroceso",
    hasRubric: true,
    criteria: [
      { text: "Identifica y activa correctamente la señal de retroceso" },
      { text: "Dirige la vista principalmente hacia atrás según el lado del obstáculo" },
      { text: "Utiliza correctamente la posición de manos y cuerpo para retroceder" },
      { text: "Comprende que la guía del vehículo es la parte trasera" },
      { text: "Controla el timón con movimientos lentos y suaves" },
      { text: "Mantiene el control del vehículo retrocediendo a baja velocidad" },
    ],
    rubricDimensions: [
      {
        name: "Control del retroceso",
        levels: [
          "No logra retroceder sin perder control u orientación",
          "Retrocede con dificultad y correcciones constantes",
          "Retrocede correctamente con indicaciones verbales",
          "Retrocede de forma independiente, lenta, segura y controlada",
        ],
      },
    ],
  },
  {
    code: "L15",
    name: "Parqueo",
    hasRubric: true,
    criteria: [
      { text: "Identifica correctamente el tipo de parqueo a realizar (frente, retroceso o lateral)" },
      { text: "Ubica el vehículo de forma correcta antes de iniciar la maniobra" },
      { text: "Controla el timón y el clutch durante el parqueo sin movimientos bruscos" },
      { text: "Utiliza correctamente las referencias visuales (cuneta, vehículo guía, espacio)" },
      { text: "Corrige la maniobra con calma cuando es necesario, sin perder el control" },
      { text: "Deja el vehículo bien ubicado dentro del espacio de parqueo" },
    ],
    // Única lección con dos dimensiones de rúbrica independientes.
    rubricDimensions: [
      {
        name: "Ubicación final del vehículo",
        levels: [
          "Queda mal ubicado o invade otros espacios",
          "Queda dentro del espacio, pero desalineado",
          "Queda bien ubicado con pequeños ajustes",
          "Queda correctamente centrado, alineado y seguro",
        ],
      },
      {
        name: "Ejecución y control del parqueo",
        levels: [
          "No logra completar el parqueo",
          "Completa el parqueo con muchas maniobras y poca precisión",
          "Completa el parqueo con correcciones moderadas",
          "Completa el parqueo con buen control, agilidad y seguridad (pocas maniobras)",
        ],
      },
    ],
  },
];

const GENERAL_EVALUATION_DIMENSIONS: RubricDimensionSeed[] = [
  {
    name: "Seguridad vial y manejo defensivo",
    levels: [
      "No identifica riesgos ni anticipa situaciones en la vía",
      "Identifica algunos riesgos, pero reacciona tarde",
      "Anticipa riesgos comunes y actúa con guía del instructor",
      "Conduce de forma defensiva, priorizando la seguridad",
    ],
  },
  {
    name: "Uso correcto y control del vehículo",
    levels: [
      "No controla adecuadamente los mandos del vehículo",
      "Controla el vehículo, pero con movimientos bruscos o inseguros",
      "Maneja correctamente los mandos con pequeñas correcciones",
      "Domina clutch, freno, acelerador y timón con suavidad y control",
    ],
  },
  {
    name: "Independencia y toma de decisiones al conducir",
    levels: [
      "Depende totalmente de las indicaciones del instructor",
      "Toma decisiones básicas, necesita corrección constante",
      "Toma buenas decisiones con apoyo ocasional",
      "Conduce de forma independiente y se adapta al entorno",
    ],
  },
];

async function main() {
  console.log("Seeding catálogo...");

  const auto = await prisma.courseType.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { name: "Auto", active: true },
    create: { id: "00000000-0000-0000-0000-000000000001", name: "Auto", active: true },
  });

  for (let i = 0; i < AUTO_LESSONS.length; i++) {
    const l = AUTO_LESSONS[i];
    const lesson = await prisma.lesson.upsert({
      where: { courseTypeId_code: { courseTypeId: auto.id, code: l.code } },
      update: {
        name: l.name,
        orderIndex: i,
        hasRubric: l.hasRubric,
        active: true,
      },
      create: {
        courseTypeId: auto.id,
        code: l.code,
        name: l.name,
        orderIndex: i,
        hasRubric: l.hasRubric,
        active: true,
      },
    });

    // Reset criteria/dimensions for idempotent reseeding.
    await prisma.lessonCriterion.deleteMany({ where: { lessonId: lesson.id } });
    await prisma.lessonRubricLevel.deleteMany({ where: { dimension: { lessonId: lesson.id } } });
    await prisma.lessonRubricDimension.deleteMany({ where: { lessonId: lesson.id } });

    for (let c = 0; c < l.criteria.length; c++) {
      await prisma.lessonCriterion.create({
        data: {
          lessonId: lesson.id,
          orderIndex: c,
          text: l.criteria[c].text,
          notApplicableIfAutomatic: l.criteria[c].notApplicableIfAutomatic ?? false,
        },
      });
    }

    for (let d = 0; d < l.rubricDimensions.length; d++) {
      const dim = l.rubricDimensions[d];
      const dimension = await prisma.lessonRubricDimension.create({
        data: {
          lessonId: lesson.id,
          orderIndex: d,
          name: dim.name,
        },
      });
      for (let lvl = 0; lvl < dim.levels.length; lvl++) {
        await prisma.lessonRubricLevel.create({
          data: {
            dimensionId: dimension.id,
            level: lvl + 1,
            description: dim.levels[lvl],
          },
        });
      }
    }

    console.log(`  ${l.code} - ${l.name} (${l.criteria.length} criterios, ${l.rubricDimensions.length} dimensiones)`);
  }

  console.log("Seeding evaluación general...");
  const existingDims = await prisma.generalEvaluationDimension.findMany();
  if (existingDims.length === 0) {
    for (let d = 0; d < GENERAL_EVALUATION_DIMENSIONS.length; d++) {
      const dim = GENERAL_EVALUATION_DIMENSIONS[d];
      const dimension = await prisma.generalEvaluationDimension.create({
        data: { orderIndex: d, name: dim.name },
      });
      for (let lvl = 0; lvl < dim.levels.length; lvl++) {
        await prisma.generalEvaluationLevel.create({
          data: {
            dimensionId: dimension.id,
            level: lvl + 1,
            description: dim.levels[lvl],
          },
        });
      }
    }
  }

  console.log("Seeding sucursales...");
  const branchNames = ["Sucursal San Salvador", "Sucursal Sonsonate"];
  const credentials: { branch: string; email: string; password: string }[] = [];

  for (const branchName of branchNames) {
    let branch = await prisma.branch.findFirst({ where: { name: branchName } });
    if (!branch) {
      branch = await prisma.branch.create({ data: { name: branchName, active: true } });
    }

    const slug = branchName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const email = `supervisor.${slug}@escuela.com`;
    const password = "admin123";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: "SUPERVISOR",
          branchId: branch.id,
        },
      });
    }
    credentials.push({ branch: branchName, email, password });
  }

  console.log("Seed completado.");
  console.log("Credenciales de prueba (cambiar en producción):");
  for (const c of credentials) {
    console.log(`  ${c.branch}: ${c.email} / ${c.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
