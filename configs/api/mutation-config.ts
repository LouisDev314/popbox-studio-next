// import appClient from '@/api/app-client';
// import { IWishlistItem } from '@/interfaces/wishlist';
// import { AxiosResponse } from 'axios';
// import { IBaseApiResponse } from '@/interfaces/api-response';
//
// const MutationConfigs = {
//   verifyEmail: (user: { email: string, isResetPassword?: boolean }) => {
//     return appClient.post('/auth/verify-email', user);
//   },
//   verifyOtp: (user: { email: string, otp: string }) => {
//     return appClient.post('/auth/verify-otp', user);
//   },
//   createUser: () => {
//     return appClient.post('/users');
//   },
//   sendOtp: (email: string) => {
//     return appClient.post('/auth/send-otp', { email });
//   },
//   addItemToWishlist: (params: { uid: string, item: Pick<IWishlistItem, 'itemId' | 'itemType'> }) => {
//     return appClient.post(`/wishlists/${params.uid}`, params.item);
//   },
//   deleteWishlistItem: (params: {
//     uid: string,
//     itemId: string
//   }) => {
//     return appClient.delete(`/wishlists/${params.uid}/${params.itemId}`);
//   },
//   addItemToCart: (params: {
//     uid: string,
//     item: ICartItem
//   }): Promise<AxiosResponse<IBaseApiResponse<ICartItem[]>>> => {
//     return appClient.post(`/carts/${params.uid}`, params.item);
//   },
//   deleteCartItem: (params: {
//     uid: string,
//     itemId: string
//   }) => {
//     return appClient.delete(`/carts/${params.uid}/${params.itemId}`);
//   },
// };
//
// export default MutationConfigs;
