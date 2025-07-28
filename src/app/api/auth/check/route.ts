import { NextRequest, NextResponse } from 'next/server';
import { blockchainService } from '@/lib/blockchain';
import { ApiResponse, UserTokenBalance } from '@/lib/types';
import { isValidEthereumAddress } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature } = body;

    if (!address || !isValidEthereumAddress(address)) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: 'Invalid wallet address',
        timestamp: Date.now(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // In a production environment, you would verify the signature here
    // to ensure the user actually controls the wallet
    if (!signature) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        error: 'Signature required for authentication',
        timestamp: Date.now(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Check token balance
    const tokenBalance = await blockchainService.checkTokenAccess(address);

    const response: ApiResponse<UserTokenBalance> = {
      success: true,
      data: tokenBalance,
      timestamp: Date.now(),
    };

    // Set authentication cookies if user has access
    const headers = new Headers();
    if (tokenBalance.hasAccess) {
      headers.set('Set-Cookie', [
        `wallet-connected=true; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`,
        `token-access=true; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`,
        `wallet-address=${address}; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`,
      ].join(', '));
    }

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Error checking authentication:', error);
    
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: 'Authentication check failed',
      timestamp: Date.now(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check current authentication status from cookies
    const walletConnected = request.cookies.get('wallet-connected');
    const hasAccess = request.cookies.get('token-access');
    const walletAddress = request.cookies.get('wallet-address');

    if (!walletConnected || !hasAccess || !walletAddress) {
      const response: ApiResponse<{ authenticated: false }> = {
        success: true,
        data: { authenticated: false },
        timestamp: Date.now(),
      };
      return NextResponse.json(response);
    }

    // Re-verify token balance
    const tokenBalance = await blockchainService.checkTokenAccess(walletAddress.value);

    const response: ApiResponse<UserTokenBalance & { authenticated: boolean }> = {
      success: true,
      data: {
        ...tokenBalance,
        authenticated: tokenBalance.hasAccess,
      },
      timestamp: Date.now(),
    };

    // Update cookies if access status changed
    if (!tokenBalance.hasAccess) {
      const headers = new Headers();
      headers.set('Set-Cookie', [
        `wallet-connected=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
        `token-access=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
        `wallet-address=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
      ].join(', '));
      return NextResponse.json(response, { headers });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting authentication status:', error);
    
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: 'Failed to get authentication status',
      timestamp: Date.now(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Logout - clear authentication cookies
    const headers = new Headers();
    headers.set('Set-Cookie', [
      `wallet-connected=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
      `token-access=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
      `wallet-address=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
    ].join(', '));

    const response: ApiResponse<{ loggedOut: boolean }> = {
      success: true,
      data: { loggedOut: true },
      timestamp: Date.now(),
    };

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('Error during logout:', error);
    
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: 'Logout failed',
      timestamp: Date.now(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}