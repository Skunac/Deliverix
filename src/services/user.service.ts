import { User} from '../models/user.model';
import { UserRepository } from '../firebase/repositories/user.repository';

export class UserService {
    private repository: UserRepository;

    constructor() {
        this.repository = new UserRepository();
    }

    async getUserById(userId: string): Promise<User | null> {
        return this.repository.getById(userId);
    }

    async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
        return this.repository.update(userId, data);
    }
}