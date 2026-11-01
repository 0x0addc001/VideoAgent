import hashlib
import secrets
from base64 import urlsafe_b64decode, urlsafe_b64encode

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def encrypt_secret(value: str, encryption_key: str) -> str:
    key = hashlib.sha256(encryption_key.encode("utf-8")).digest()
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(key).encrypt(nonce, value.encode("utf-8"), None)
    return urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_secret(value: str, encryption_key: str) -> str:
    key = hashlib.sha256(encryption_key.encode("utf-8")).digest()
    payload = urlsafe_b64decode(value.encode("ascii"))
    nonce, ciphertext = payload[:12], payload[12:]
    return AESGCM(key).decrypt(nonce, ciphertext, None).decode("utf-8")
