import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { logError } from './logger';
import { ActivityAction } from '../types';

interface Actor { uid: string; displayName: string; photoURL: string; }
interface LogFields { targetName?: string; amount?: number; currency?: string; extraInfo?: string; }

export async function writeLog(
  groupId: string,
  action: ActivityAction,
  actor: Actor,
  fields: LogFields = {}
) {
  try {
    await addDoc(collection(db, 'groups', groupId, 'activityLog'), {
      action,
      actorId: actor.uid,
      actorName: actor.displayName,
      actorPhoto: actor.photoURL || '',
      ...fields,
      groupId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('activityLog', `write error: ${error}`);
  }
}
