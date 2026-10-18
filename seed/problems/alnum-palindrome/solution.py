def alnum_palindrome(text):
    def keep(ch):
        return ch.isascii() and ch.isalnum()

    lo, hi = 0, len(text) - 1
    while lo < hi:
        if not keep(text[lo]):
            lo += 1
        elif not keep(text[hi]):
            hi -= 1
        elif text[lo].lower() != text[hi].lower():
            return False
        else:
            lo += 1
            hi -= 1
    return True
