import Seller from '../models/seller/sellerModel';
import SellerAuthService from '../services/seller/SellerAuthService';
import { ISeller } from '../models/seller/type';

const sellerAuthController = new SellerAuthService<ISeller>(Seller);

export default sellerAuthController;
