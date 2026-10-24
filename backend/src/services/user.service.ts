import type { AppUser, GoogleUserProfile } from "../models/user.model.js";
import {
  findUserById as findUserByIdInDatabase,
  saveGoogleUser,
} from "../repositories/user.repository.js";

export async function findOrCreateUser(
  profile: GoogleUserProfile
): Promise<AppUser> {
  return saveGoogleUser(profile);
}

export async function getUserById(id: number): Promise<AppUser | null> {
  return findUserByIdInDatabase(id);
}
