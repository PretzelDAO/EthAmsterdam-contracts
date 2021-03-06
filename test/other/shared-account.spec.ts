import '@nomiclabs/hardhat-ethers';
import { expect } from 'chai';
import { ZERO_ADDRESS } from '../helpers/constants';
import { SharedAccount, SharedAccount__factory, ERC721Enumerable, ERC721Enumerable__factory } from '../../typechain-types';
import {
  deployer,
  freeCollectModule,
  approvalFollowModule,
  FIRST_PROFILE_ID,
  governance,
  lensHub,
  makeSuiteCleanRoom,
  mockFollowModule,
  mockModuleData,
  MOCK_FOLLOW_NFT_URI,
  MOCK_PROFILE_HANDLE,
  MOCK_PROFILE_URI,
  MOCK_URI,
  user,
  userAddress,
  userTwo,
  userTwoAddress,
  abiCoder,
} from '../__setup.spec';
import { BigNumber } from 'ethers';
import { TokenDataStructOutput } from '../../typechain-types/LensHub';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { ERRORS } from '../helpers/errors';

makeSuiteCleanRoom('Shared Account Smart Contract', function () {
  context('Generic', function () {
    let sharedAccount: SharedAccount;
    beforeEach(async function () {
      sharedAccount = await new SharedAccount__factory(deployer).deploy(
        lensHub.address,
        userAddress,
        userAddress
      );
    });

    context('Negatives', function () {
      it('UserTwo should fail to grant role', async function () {
        await expect(
          sharedAccount
            .connect(userTwo)
            .grantRole(keccak256(toUtf8Bytes('POSTER_ROLE')), userAddress)
        ).to.be.reverted;
      });

      it('UserTwo should fail to create a post', async function () {
        await expect(
          lensHub.connect(governance).whitelistCollectModule(freeCollectModule.address, true)
        ).to.not.be.reverted;

        await expect(
          lensHub.createProfile({
            to: sharedAccount.address,
            handle: MOCK_PROFILE_HANDLE,
            imageURI: MOCK_PROFILE_URI,
            followModule: ZERO_ADDRESS,
            followModuleInitData: [],
            followNFTURI: MOCK_FOLLOW_NFT_URI,
          })
        ).to.not.be.reverted;

        await expect(
          sharedAccount.connect(userTwo).post({
            profileId: FIRST_PROFILE_ID,
            contentURI: MOCK_URI,
            collectModule: freeCollectModule.address,
            collectModuleInitData: [],
            referenceModule: ZERO_ADDRESS,
            referenceModuleInitData: [],
          })
        ).to.be.reverted;
      });
    });

    context('Scenarios', function () {
      beforeEach(async function () {
        let owner: string;
        let profileId: BigNumber;
        let tokenData: TokenDataStructOutput;

        await expect(
          lensHub.connect(user).createProfile({
            to: sharedAccount.address,
            handle: MOCK_PROFILE_HANDLE,
            imageURI: MOCK_PROFILE_URI,
            followModule: ZERO_ADDRESS,
            followModuleInitData: [],
            followNFTURI: MOCK_FOLLOW_NFT_URI,
          })
        ).to.not.be.reverted;

        owner = await lensHub.ownerOf(FIRST_PROFILE_ID);
        profileId = await lensHub.getProfileIdByHandle(MOCK_PROFILE_HANDLE);
        tokenData = await lensHub.tokenDataOf(FIRST_PROFILE_ID);
        expect(owner).to.eq(sharedAccount.address);
        expect(profileId).to.eq(FIRST_PROFILE_ID);
        expect(tokenData.owner).to.eq(sharedAccount.address);
      });

      it('User should transfer ProfileNFT to userTwoAddress', async function () {
        await expect(
          sharedAccount.connect(user).transferProfileNFT(FIRST_PROFILE_ID, userTwoAddress)
        ).to.not.be.reverted;
        expect(await lensHub.ownerOf(FIRST_PROFILE_ID)).to.eq(userTwoAddress);
      });

      it('User should set a whitelisted follow module use sharedAccount, fetching the profile follow module should return the correct address, user then sets it to the zero address and fetching returns the zero address', async function () {
        await expect(
          lensHub.connect(governance).whitelistFollowModule(mockFollowModule.address, true)
        ).to.not.be.reverted;

        await expect(
          sharedAccount
            .connect(user)
            .setFollowModule(FIRST_PROFILE_ID, mockFollowModule.address, mockModuleData)
        ).to.not.be.reverted;
        expect(await lensHub.getFollowModule(FIRST_PROFILE_ID)).to.eq(mockFollowModule.address);

        await expect(
          sharedAccount.connect(user).setFollowModule(FIRST_PROFILE_ID, ZERO_ADDRESS, [])
        ).to.not.be.reverted;
        expect(await lensHub.getFollowModule(FIRST_PROFILE_ID)).to.eq(ZERO_ADDRESS);
      });

      it('User should set UserTwo as a posters, and UserTwo should create a post with empty collect and reference module data, fetched post data should be accurate', async function () {
        await expect(
          lensHub.connect(governance).whitelistCollectModule(freeCollectModule.address, true)
        ).to.not.be.reverted;

        await expect(
          sharedAccount
            .connect(user)
            .grantRole(keccak256(toUtf8Bytes('POSTER_ROLE')), userTwoAddress)
        ).to.not.be.reverted;


        await sharedAccount.connect(userTwo).post({
          profileId: FIRST_PROFILE_ID,
          contentURI: MOCK_URI,
          collectModule: freeCollectModule.address,
          collectModuleInitData: abiCoder.encode(['bool'], [true]),
          referenceModule: ZERO_ADDRESS,
          referenceModuleInitData: [],
        })


        const pub = await lensHub.getPub(FIRST_PROFILE_ID, 1);
        expect(pub.profileIdPointed).to.eq(0);
        expect(pub.pubIdPointed).to.eq(0);
        expect(pub.contentURI).to.eq(MOCK_URI);
        expect(pub.collectModule).to.eq(freeCollectModule.address);
        expect(pub.collectNFT).to.eq(ZERO_ADDRESS);
        expect(pub.referenceModule).to.eq(ZERO_ADDRESS);
      });

      it('User should set UserTwo as a posters, and revoke UserTwo poster role, UserTwo should fail to create a post', async function () {
        await expect(
          lensHub.connect(governance).whitelistCollectModule(freeCollectModule.address, true)
        ).to.not.be.reverted;

        await expect(
          sharedAccount
            .connect(user)
            .grantRole(keccak256(toUtf8Bytes('POSTER_ROLE')), userTwoAddress)
        ).to.not.be.reverted;

        await expect(
          sharedAccount.connect(userTwo).post({
            profileId: FIRST_PROFILE_ID,
            contentURI: MOCK_URI,
            collectModule: freeCollectModule.address,
            collectModuleInitData: abiCoder.encode(['bool'], [true]),
            referenceModule: ZERO_ADDRESS,
            referenceModuleInitData: [],
          })
        ).to.not.be.reverted;

        await expect(
          sharedAccount
            .connect(user)
            .revokeRole(keccak256(toUtf8Bytes('POSTER_ROLE')), userTwoAddress)
        ).to.not.be.reverted;

        await expect(
          sharedAccount.connect(userTwo).post({
            profileId: FIRST_PROFILE_ID,
            contentURI: MOCK_URI,
            collectModule: freeCollectModule.address,
            collectModuleInitData: [],
            referenceModule: ZERO_ADDRESS,
            referenceModuleInitData: [],
          })
        ).to.be.reverted;
      });

      it('User should set UserTwo as a posters, UserTwo should create a post & comment', async function () {
        await expect(
          lensHub.connect(governance).whitelistCollectModule(freeCollectModule.address, true)
        ).to.not.be.reverted;

        await expect(
          sharedAccount
            .connect(user)
            .grantRole(keccak256(toUtf8Bytes('POSTER_ROLE')), userTwoAddress)
        ).to.not.be.reverted;

        await expect(
          sharedAccount.connect(userTwo).post({
            profileId: FIRST_PROFILE_ID,
            contentURI: MOCK_URI,
            collectModule: freeCollectModule.address,
            collectModuleInitData: abiCoder.encode(['bool'], [true]),
            referenceModule: ZERO_ADDRESS,
            referenceModuleInitData: [],
          })
        ).to.not.be.reverted;

        await expect(
          sharedAccount.connect(userTwo).comment({
            profileId: FIRST_PROFILE_ID,
            contentURI: MOCK_URI,
            profileIdPointed: FIRST_PROFILE_ID,
            pubIdPointed: 1,
            referenceModuleData: [],
            collectModule: freeCollectModule.address,
            collectModuleInitData: abiCoder.encode(['bool'], [true]),
            referenceModule: ZERO_ADDRESS,
            referenceModuleInitData: [],
          })
        ).to.not.be.reverted;
      });

      it.only('Follow call should work when address was previously approved', async function () {
        await lensHub.connect(userTwo).createProfile({
          to: userTwoAddress,
          handle: 'plant2ghost.eth',
          imageURI: MOCK_PROFILE_URI,
          followModule: ZERO_ADDRESS,
          followModuleInitData: [],
          followNFTURI: MOCK_FOLLOW_NFT_URI,
        });
        await lensHub.connect(governance).whitelistFollowModule(approvalFollowModule.address, true)
        await lensHub.connect(userTwo).setFollowModule(2, approvalFollowModule.address, [])
        await approvalFollowModule.connect(userTwo).approve(2, [sharedAccount.address], [true])
        await expect(sharedAccount.connect(user).followOnBehalf(userAddress, [2], [[]])).to.not.be.reverted;
        let token: ERC721Enumerable = ERC721Enumerable__factory.connect(
          await lensHub.getFollowNFT(2),
          deployer
        );
        // console.log(await lensHub.getFollowNFT(2));
        // console.log(token)
        expect(await token.ownerOf(1)).to.eq(userAddress)
      });
    });
  });
});