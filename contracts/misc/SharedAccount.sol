// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.10;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol';
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


import {ILensHub} from '../interfaces/ILensHub.sol';
import {DataTypes} from '../libraries/DataTypes.sol';

/**
 * @title SharedAccount
 * @author Lens Protocol, WATCHPUG
 *
 * @dev A smart contract that will hold a ProfileNFT, it has 2 roles,
 * 1) admin: which can set FollowModules, transfer the ProfileNFT to another address, and add/remove posters.
 * 2) posters: only able to create publications..
 */
contract SharedAccount is AccessControl, ERC721Holder {
  address immutable HUB;

  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  bytes32 public constant POSTER_ROLE = keccak256('POSTER_ROLE');
  mapping (string => uint) public twitterIdToProfileId;
  mapping (uint => string) public profileIdToTwitterId;

  constructor(
    address hub,
    address _admin,
    address _defaultPoster
  ) {
    HUB = hub;

    _setRoleAdmin(POSTER_ROLE, ADMIN_ROLE);
    _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    _setupRole(ADMIN_ROLE, _admin);

    if (_defaultPoster != address(0)) {
      _setupRole(POSTER_ROLE, _defaultPoster);
    }
  }

  function setFollowModule(
    uint256 profileId,
    address followModule,
    bytes calldata followModuleData
  ) external onlyRole(ADMIN_ROLE) {
    ILensHub(HUB).setFollowModule(profileId, followModule, followModuleData);
  }

  function transferProfileNFT(uint256 profileId, address to) external onlyRole(ADMIN_ROLE) {
    IERC721Enumerable(HUB).transferFrom(address(this), to, profileId);
  }

  function post(DataTypes.PostData calldata vars) external onlyRole(POSTER_ROLE) {
    ILensHub(HUB).post(vars);
  }

  function comment(DataTypes.CommentData calldata vars) external onlyRole(POSTER_ROLE) {
    ILensHub(HUB).comment(vars);
  }

  function mirror(DataTypes.MirrorData calldata vars) external onlyRole(POSTER_ROLE) {
    ILensHub(HUB).mirror(vars);
  }

  function followOnBehalf(address onBehalfOf, uint256[] calldata profileIds, bytes[] calldata datas) external onlyRole(POSTER_ROLE) {
      uint[] memory tokenIds = ILensHub(HUB).follow(profileIds, datas);
      for (uint256 i= 0; i < tokenIds.length;) {
        IERC721(ILensHub(HUB).getFollowNFT(profileIds[i])).safeTransferFrom(
            address(this),
            onBehalfOf,
            tokenIds[i]
        );
        unchecked {
            i ++;
        }
      }
  }

    function unFollowOnBehalf(address onBehalfOf, uint256[] calldata profileIds, bytes[] calldata datas) external onlyRole(POSTER_ROLE) {
      uint[] memory tokenIds = ILensHub(HUB).follow(profileIds, datas);
      for (uint256 i= 0; i < tokenIds.length;) {
        IERC721(ILensHub(HUB).getFollowNFT(profileIds[i])).safeTransferFrom(
            address(this),
            onBehalfOf,
            tokenIds[i]
        );
        unchecked {
            i ++;
        }
      }
  }

  function linkTwitter(string memory twitterId, uint lensId) external onlyRole(POSTER_ROLE) {
      twitterIdToProfileId[twitterId] = lensId;
      profileIdToTwitterId[lensId] = twitterId;
  }
}