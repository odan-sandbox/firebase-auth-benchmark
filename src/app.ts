import admin from "firebase-admin";
import firebase from "firebase";

import stats from "stats-lite";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require("../fir-auth-benchmark-firebase-adminsdk-h86im-ba68fba4fd.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

firebase.initializeApp({
  projectId: "fir-auth-benchmark",
  apiKey: "AIzaSyCv2V-WM-AlCJJMctrS2AM6kzRgvKIicto",
});

type Benchmark = {
  times: number;
  mean: number;
  stdev: number;
};

async function exec(func: () => Promise<void>, times = 10): Promise<Benchmark> {
  const execTimes: number[] = [];
  for (let i = 0; i < times; i++) {
    const start = new Date().getTime();
    await func();
    execTimes.push(new Date().getTime() - start);
  }

  const mean = stats.mean(execTimes);
  const stdev = stats.stdev(execTimes);

  return {
    times,
    mean,
    stdev,
  };
}

function pretty(benchmark: Benchmark): string {
  return `${benchmark.mean.toFixed(1)} ms ± ${benchmark.stdev.toFixed(1)} ms (${
    benchmark.times
  } runs)`;
}

async function execCreateUser(): Promise<void> {
  const result = await exec(async () => {
    await admin.auth().createUser({});
  });
  console.log(pretty(result));
}

async function execGetUser(): Promise<void> {
  const user = await admin.auth().createUser({});

  const result = await exec(async () => {
    await admin.auth().getUser(user.uid);
  });
  console.log(pretty(result));
}

async function execOnAuthStateChanged(): Promise<void> {
  await firebase.auth().signInAnonymously();

  const result = await exec(async () => {
    await new Promise((resolve) => {
      firebase.auth().onAuthStateChanged(() => {
        resolve();
      });
    });
  });
  console.log(pretty(result));
}
async function execGetIdToken(): Promise<void> {
  const credential = await firebase.auth().signInAnonymously();

  const result = await exec(async () => {
    await credential.user?.getIdToken();
  });
  console.log(pretty(result));
}

async function execVerifyIdTokenWithCheckRevoked(): Promise<void> {
  const credential = await firebase.auth().signInAnonymously();

  const idToken = await credential.user?.getIdToken();

  const result = await exec(async () => {
    if (!idToken) {
      throw new Error();
    }
    await admin.auth().verifyIdToken(idToken, true);
  });
  console.log(pretty(result));
}

async function execVerifyIdTokenWithoutCheckRevoked(): Promise<void> {
  const credential = await firebase.auth().signInAnonymously();

  const idToken = await credential.user?.getIdToken();

  const result = await exec(async () => {
    if (!idToken) {
      throw new Error();
    }
    await admin.auth().verifyIdToken(idToken, false);
  });
  console.log(pretty(result));
}

async function main(): Promise<void> {
  await execCreateUser();
  await execGetUser();
  await execOnAuthStateChanged();
  await execGetIdToken();
  await execVerifyIdTokenWithCheckRevoked();
  await execVerifyIdTokenWithoutCheckRevoked();
}

main();

process.on("unhandledRejection", (reason) => {
  console.error(reason);
  process.exit(1);
});
