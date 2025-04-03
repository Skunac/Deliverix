import { BaseRepository } from './base.repository';
import { User } from '../../models/user.model';
import { COLLECTIONS } from '../collections';

export class UserRepository extends BaseRepository<User> {
    constructor() {
        super(COLLECTIONS.USERS);
    }
}