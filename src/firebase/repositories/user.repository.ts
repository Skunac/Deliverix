import { User } from '../../models/user.model';
import { BaseRepository } from './base.repository';
import { Collections } from '../collections';
import { toFirestoreUser, fromFirestoreUser } from '../adapters/user.adapter';

class UserRepository extends BaseRepository<User> {
    constructor() {
        super(Collections.USERS);
    }

    async getById(id: string): Promise<User | null> {
        const doc = await this.getCollectionRef().doc(id).get();

        if (!doc.exists) {
            return null;
        }

        return fromFirestoreUser(doc.id, doc.data()!);
    }

    async create(userData: Omit<User, 'id'>, id?: string): Promise<string> {
        const firestoreData = toFirestoreUser(userData);

        return super.create(firestoreData as any, id);
    }

    async findByEmail(email: string): Promise<User | null> {
        const users = await this.query([['email', '==', email]], undefined, undefined, 1);
        return users.length > 0 ? users[0] : null;
    }
}

export const userRepository = new UserRepository();
