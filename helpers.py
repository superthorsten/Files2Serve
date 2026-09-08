"""Shared helper functions for the Files2Serve application."""
import secrets
def create_hash():
    return secrets.token_hex(8)