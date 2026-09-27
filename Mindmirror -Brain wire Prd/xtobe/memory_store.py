
class MemoryStore:
    def __init__(self):
        self.store=[]
    def add(self, item): self.store.append(item)
    def search(self, query, k=5): return self.store[:k]
